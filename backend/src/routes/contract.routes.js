// PRD FR-4 — "гол flow": санал зөвшөөрөгдснөөс Гэрээ (Contract) + Milestone-ууд
// үүсэж, milestone тус бүр escrow-оор санхүүжигдэж, хүлээлгэн өгөгдөж,
// батлагдаж, комисс хасагдсан дүн freelancer-ийн балансад ордог бүрэн урсгал.
import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { requireAuth, requireClientProfile } from '../middleware/auth.js';
import { acceptProposalSchema, deliverMilestoneSchema } from '../validators/contract.schema.js';
import { computeBalance } from '../lib/wallet.js';
import { createNotification } from './notification.routes.js';

const router = Router();

function validate(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) return { error: result.error.issues.map((i) => i.message) };
  return { data: result.data };
}

const AUTO_APPROVE_DAYS = 7;

async function requireFreelancerProfile(req, res, next) {
  const profile = await prisma.freelancerProfile.findUnique({ where: { userId: req.user.id } });
  if (!profile) return res.status(403).json({ error: 'Freelancer профайл шаардлагатай' });
  req.freelancerProfile = profile;
  next();
}

function publicContract(c) {
  return {
    id: c.id,
    jobId: c.jobId,
    job: c.job && { id: c.job.id, title: c.job.title },
    clientId: c.clientId,
    client: c.client?.user && { id: c.client.userId, name: c.client.user.name, orgName: c.client.orgName },
    freelancerId: c.freelancerId,
    freelancer: c.freelancer?.user && { id: c.freelancer.userId, name: c.freelancer.user.name, headline: c.freelancer.headline },
    totalAmount: c.totalAmount,
    commissionPct: c.commissionPct,
    status: c.status,
    milestones: c.milestones,
    createdAt: c.createdAt,
  };
}

// Хүлээлгэн өгсөнөөс хойш 7 хоног өнгөрсөн ч client хариу өгөөгүй DELIVERED
// milestone-уудыг "унших мөчид" автоматаар батална (FR-4.5) — cron биш,
// server-ийн ямар ч route milestone/contract-ыг унших бүрд дуудагдана.
async function autoApprovePastDue(contractId) {
  const due = await prisma.milestone.findMany({
    where: { contractId, status: 'DELIVERED', autoApproveAt: { lte: new Date() } },
  });
  for (const m of due) {
    await releaseMilestonePayment(m).catch((err) => console.error('[auto-approve] алдаа:', err.message));
  }
}

// Гэрээний бүх milestone APPROVED болсон эсэхийг шалгаж, тийм бол Contract/
// Job-ыг дуусгана. Энгийн батлалт (releaseMilestonePayment) болон admin-ийн
// dispute-шийдвэрлэлт (CLIENT/SPLIT — тэдгээр нь milestone-ийг шууд APPROVED
// болгодог тул мөн адил шалгалт хэрэгтэй) хоёуланд нь ашиглагдана.
async function maybeCompleteContract(contractId, freelancerProfileId) {
  const remaining = await prisma.milestone.count({ where: { contractId, status: { not: 'APPROVED' } } });
  if (remaining > 0) return;
  const done = await prisma.contract.update({ where: { id: contractId }, data: { status: 'COMPLETED' } });
  await prisma.freelancerProfile.update({ where: { id: freelancerProfileId }, data: { jobsCompleted: { increment: 1 } } });
  await prisma.job.update({ where: { id: done.jobId }, data: { status: 'CLOSED' } });
}

// Milestone-ийн escrow-д түгжигдсэн дүнг комисс хасаад freelancer рүү шилжүүлж,
// бүх milestone дууссан бол Contract/Job-ыг дуусгана.
async function releaseMilestonePayment(milestone) {
  const contract = await prisma.contract.findUnique({ where: { id: milestone.contractId } });
  const freelancerProfile = await prisma.freelancerProfile.findUnique({ where: { id: contract.freelancerId } });
  const commission = Math.round((milestone.amount * contract.commissionPct) / 100);
  const payout = milestone.amount - commission;

  const updated = await prisma.$transaction(async (tx) => {
    await tx.transaction.create({
      data: {
        userId: freelancerProfile.userId,
        kind: 'ESCROW_RELEASE',
        status: 'COMPLETED',
        amount: payout,
        milestoneId: milestone.id,
        completedAt: new Date(),
      },
    });
    return tx.milestone.update({ where: { id: milestone.id }, data: { status: 'APPROVED', approvedAt: new Date() } });
  });

  await maybeCompleteContract(milestone.contractId, freelancerProfile.id);

  createNotification({
    userId: freelancerProfile.userId,
    type: 'payment',
    text: `"${milestone.title}" milestone батлагдаж $${payout.toLocaleString('en-US')} (${contract.commissionPct}% комисс хассан) таны балансад орлоо`,
    link: 'my-projects',
  });

  return updated;
}

// ── GET /proposals/mine ── (freelancer-ийн өөрийн бүх санал)
router.get('/proposals/mine', requireAuth, requireFreelancerProfile, async (req, res, next) => {
  try {
    const proposals = await prisma.proposal.findMany({
      where: { freelancerId: req.freelancerProfile.id },
      include: { job: { include: { client: { include: { user: { select: { name: true } } } } } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({
      proposals: proposals.map((p) => ({
        id: p.id,
        price: p.price,
        durationDays: p.durationDays,
        coverLetter: p.coverLetter,
        status: p.status,
        createdAt: p.createdAt,
        job: { id: p.job.id, title: p.job.title, status: p.job.status, clientName: p.job.client?.user?.name || p.job.client?.orgName },
      })),
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /proposals/:id/accept ── (client санал зөвшөөрч Гэрээ үүсгэнэ)
router.post('/proposals/:id/accept', requireAuth, requireClientProfile, async (req, res, next) => {
  try {
    const proposal = await prisma.proposal.findUnique({ where: { id: req.params.id }, include: { job: true } });
    if (!proposal) return res.status(404).json({ error: 'Олдсонгүй' });
    if (proposal.job.clientId !== req.clientProfile.id) return res.status(403).json({ error: 'Хандах эрхгүй' });
    if (proposal.status !== 'PENDING') return res.status(409).json({ error: 'Энэ санал аль хэдийн шийдэгдсэн байна' });

    const { data, error } = validate(acceptProposalSchema, req.body);
    if (error) return res.status(400).json({ error });

    const milestonesInput = data.milestones?.length ? data.milestones : [{ title: proposal.job.title, amount: proposal.price }];
    const sum = milestonesInput.reduce((s, m) => s + m.amount, 0);
    if (sum !== proposal.price) {
      return res.status(400).json({ error: `Milestone-уудын нийлбэр ($${sum}) саналын дүнтэй ($${proposal.price}) тэнцэхгүй байна` });
    }

    const contract = await prisma.$transaction(async (tx) => {
      const c = await tx.contract.create({
        data: {
          jobId: proposal.jobId,
          proposalId: proposal.id,
          clientId: req.clientProfile.id,
          freelancerId: proposal.freelancerId,
          totalAmount: proposal.price,
          milestones: { create: milestonesInput.map((m, i) => ({ title: m.title, amount: m.amount, order: i })) },
        },
        include: { milestones: true, job: true, client: { include: { user: true } }, freelancer: { include: { user: true } } },
      });
      await tx.proposal.update({ where: { id: proposal.id }, data: { status: 'ACCEPTED' } });
      await tx.proposal.updateMany({
        where: { jobId: proposal.jobId, id: { not: proposal.id }, status: 'PENDING' },
        data: { status: 'REJECTED' },
      });
      await tx.job.update({ where: { id: proposal.jobId }, data: { status: 'IN_PROGRESS' } });
      return c;
    });

    res.status(201).json(publicContract(contract));

    const freelancerUser = await prisma.freelancerProfile.findUnique({ where: { id: proposal.freelancerId }, select: { userId: true } });
    if (freelancerUser) {
      createNotification({
        userId: freelancerUser.userId,
        type: 'job',
        text: `Таны "${proposal.job.title}" зарын санал зөвшөөрөгдөж гэрээ үүслээ`,
        link: 'my-projects',
      });
    }
  } catch (err) {
    next(err);
  }
});

// ── GET /contracts/mine ── (client болон freelancer аль аль нь өөрийн гэрээгээ хардаг)
router.get('/contracts/mine', requireAuth, async (req, res, next) => {
  try {
    const [clientProfile, freelancerProfile] = await Promise.all([
      prisma.clientProfile.findUnique({ where: { userId: req.user.id } }),
      prisma.freelancerProfile.findUnique({ where: { userId: req.user.id } }),
    ]);

    const where = { OR: [] };
    if (clientProfile) where.OR.push({ clientId: clientProfile.id });
    if (freelancerProfile) where.OR.push({ freelancerId: freelancerProfile.id });
    if (where.OR.length === 0) return res.json({ contracts: [] });

    const contracts = await prisma.contract.findMany({
      where,
      include: {
        job: true,
        client: { include: { user: { select: { name: true } } } },
        freelancer: { include: { user: { select: { name: true } } } },
        milestones: { orderBy: { order: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    for (const c of contracts) await autoApprovePastDue(c.id);
    const fresh = await prisma.contract.findMany({
      where: { id: { in: contracts.map((c) => c.id) } },
      include: {
        job: true,
        client: { include: { user: { select: { name: true } } } },
        freelancer: { include: { user: { select: { name: true } } } },
        milestones: { orderBy: { order: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ contracts: fresh.map(publicContract) });
  } catch (err) {
    next(err);
  }
});

// ── GET /contracts/:id ──
router.get('/contracts/:id', requireAuth, async (req, res, next) => {
  try {
    await autoApprovePastDue(req.params.id);
    const contract = await prisma.contract.findUnique({
      where: { id: req.params.id },
      include: {
        job: true,
        client: { include: { user: { select: { name: true } } } },
        freelancer: { include: { user: { select: { name: true } } } },
        milestones: { orderBy: { order: 'asc' } },
      },
    });
    if (!contract) return res.status(404).json({ error: 'Олдсонгүй' });

    const [clientProfile, freelancerProfile] = await Promise.all([
      prisma.clientProfile.findUnique({ where: { userId: req.user.id } }),
      prisma.freelancerProfile.findUnique({ where: { userId: req.user.id } }),
    ]);
    const isParticipant = contract.clientId === clientProfile?.id || contract.freelancerId === freelancerProfile?.id;
    if (!isParticipant) return res.status(403).json({ error: 'Хандах эрхгүй' });

    res.json(publicContract(contract));
  } catch (err) {
    next(err);
  }
});

async function loadMilestoneForAction(id) {
  return prisma.milestone.findUnique({ where: { id }, include: { contract: true } });
}

// ── POST /milestones/:id/fund ── (client escrow-д мөнгө байршуулна)
router.post('/milestones/:id/fund', requireAuth, requireClientProfile, async (req, res, next) => {
  try {
    const milestone = await loadMilestoneForAction(req.params.id);
    if (!milestone) return res.status(404).json({ error: 'Олдсонгүй' });
    if (milestone.contract.clientId !== req.clientProfile.id) return res.status(403).json({ error: 'Хандах эрхгүй' });
    if (milestone.status !== 'PENDING_FUNDING') return res.status(409).json({ error: 'Энэ milestone аль хэдийн санхүүжсэн байна' });

    const balance = await computeBalance(req.user.id);
    if (balance < milestone.amount) {
      return res.status(400).json({ error: 'Үлдэгдэл хүрэлцэхгүй байна — Payments хуудаснаас эхлээд мөнгө нэмнэ үү' });
    }

    const [, updated] = await prisma.$transaction([
      prisma.transaction.create({
        data: {
          userId: req.user.id,
          kind: 'ESCROW_HOLD',
          status: 'COMPLETED',
          amount: milestone.amount,
          milestoneId: milestone.id,
          completedAt: new Date(),
        },
      }),
      prisma.milestone.update({ where: { id: milestone.id }, data: { status: 'FUNDED', fundedAt: new Date() } }),
    ]);

    res.json({ milestone: updated, balance: await computeBalance(req.user.id) });

    const freelancerUser = await prisma.freelancerProfile.findUnique({ where: { id: milestone.contract.freelancerId }, select: { userId: true } });
    if (freelancerUser) {
      createNotification({ userId: freelancerUser.userId, type: 'payment', text: `"${milestone.title}" milestone санхүүжигдлээ — ажлаа эхлүүлж болно`, link: 'my-projects' });
    }
  } catch (err) {
    next(err);
  }
});

// ── POST /milestones/:id/deliver ── (freelancer хүлээлгэн өгнө)
router.post('/milestones/:id/deliver', requireAuth, requireFreelancerProfile, async (req, res, next) => {
  try {
    const milestone = await loadMilestoneForAction(req.params.id);
    if (!milestone) return res.status(404).json({ error: 'Олдсонгүй' });
    if (milestone.contract.freelancerId !== req.freelancerProfile.id) return res.status(403).json({ error: 'Хандах эрхгүй' });
    if (milestone.status !== 'FUNDED') return res.status(409).json({ error: 'Энэ milestone санхүүжээгүй тул хүлээлгэн өгөх боломжгүй' });

    const { data, error } = validate(deliverMilestoneSchema, req.body);
    if (error) return res.status(400).json({ error });

    const autoApproveAt = new Date(Date.now() + AUTO_APPROVE_DAYS * 24 * 60 * 60 * 1000);
    const updated = await prisma.milestone.update({
      where: { id: milestone.id },
      data: { status: 'DELIVERED', deliveryNote: data.note, deliveryLink: data.link, deliveredAt: new Date(), autoApproveAt },
    });

    res.json({ milestone: updated });

    const clientUser = await prisma.clientProfile.findUnique({ where: { id: milestone.contract.clientId }, select: { userId: true } });
    if (clientUser) {
      createNotification({ userId: clientUser.userId, type: 'job', text: `"${milestone.title}" milestone хүлээлгэн өгөгдлөө — 7 хоногийн дотор баталгаажуулна уу`, link: 'my-projects' });
    }
  } catch (err) {
    next(err);
  }
});

// ── POST /milestones/:id/approve ── (client баталж, комисс хассан дүн freelancer рүү орно)
router.post('/milestones/:id/approve', requireAuth, requireClientProfile, async (req, res, next) => {
  try {
    const milestone = await loadMilestoneForAction(req.params.id);
    if (!milestone) return res.status(404).json({ error: 'Олдсонгүй' });
    if (milestone.contract.clientId !== req.clientProfile.id) return res.status(403).json({ error: 'Хандах эрхгүй' });
    if (milestone.status !== 'DELIVERED') return res.status(409).json({ error: 'Энэ milestone хараахан хүлээлгэн өгөгдөөгүй байна' });

    const updated = await releaseMilestonePayment(milestone);
    res.json({ milestone: updated });
  } catch (err) {
    next(err);
  }
});

// ── POST /milestones/:id/request-revision ── (client засвар хүснэ)
router.post('/milestones/:id/request-revision', requireAuth, requireClientProfile, async (req, res, next) => {
  try {
    const milestone = await loadMilestoneForAction(req.params.id);
    if (!milestone) return res.status(404).json({ error: 'Олдсонгүй' });
    if (milestone.contract.clientId !== req.clientProfile.id) return res.status(403).json({ error: 'Хандах эрхгүй' });
    if (milestone.status !== 'DELIVERED') return res.status(409).json({ error: 'Энэ milestone хараахан хүлээлгэн өгөгдөөгүй байна' });

    const updated = await prisma.milestone.update({
      where: { id: milestone.id },
      data: { status: 'FUNDED', deliveryNote: null, deliveryLink: null, deliveredAt: null, autoApproveAt: null },
    });

    res.json({ milestone: updated });

    const freelancerUser = await prisma.freelancerProfile.findUnique({ where: { id: milestone.contract.freelancerId }, select: { userId: true } });
    if (freelancerUser) {
      const note = req.body?.note ? `: ${req.body.note}` : '';
      createNotification({ userId: freelancerUser.userId, type: 'job', text: `"${milestone.title}" milestone-д засвар хүсэгдлээ${note}`, link: 'my-projects' });
    }
  } catch (err) {
    next(err);
  }
});

export { releaseMilestonePayment, maybeCompleteContract };
export default router;
