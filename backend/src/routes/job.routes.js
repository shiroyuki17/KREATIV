import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { requireAuth, requireClientProfile } from '../middleware/auth.js';
import { requireActiveUser, jobEditBlockReason, jobDeleteBlockReason } from '../middleware/abac.js';
import { jobCreateSchema, jobUpdateSchema, jobQuerySchema } from '../validators/job.schema.js';
import { proposalCreateSchema } from '../validators/contract.schema.js';
import { sendMail } from '../lib/mailer.js';
import { createNotification } from './notification.routes.js';
import { detectLeakage } from '../lib/leakage.js';
import { logEvent } from '../lib/logger.js';

// FR-3.3: сард 5 үнэгүй санал (спам бууруулах + Ph.2 монетизацийн суурь)
const FREE_PROPOSALS_PER_MONTH = 5;

const router = Router();

function validate(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) return { error: result.error.issues.map((i) => i.message) };
  return { data: result.data };
}

const clientInclude = { client: { include: { user: { select: { name: true } } } } };

function publicProposal(p) {
  return {
    id: p.id,
    jobId: p.jobId,
    price: p.price,
    durationDays: p.durationDays,
    coverLetter: p.coverLetter,
    status: p.status,
    createdAt: p.createdAt,
    freelancer: p.freelancer && {
      id: p.freelancer.id,
      userId: p.freelancer.userId,
      name: p.freelancer.user?.name,
      avatarUrl: p.freelancer.user?.avatarUrl,
      headline: p.freelancer.headline,
      ratingAvg: p.freelancer.ratingAvg,
      jobsCompleted: p.freelancer.jobsCompleted,
    },
  };
}

function publicJob(job) {
  return {
    id: job.id,
    title: job.title,
    description: job.description,
    category: job.category,
    skills: job.skills,
    languages: job.languages,
    budgetType: job.budgetType,
    budgetMin: job.budgetMin,
    budgetMax: job.budgetMax,
    status: job.status,
    deadline: job.deadline,
    moderationStatus: job.moderationStatus,
    moderationReason: job.moderationReason,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    client: job.client && {
      id: job.client.id,
      name: job.client.user?.name,
      orgName: job.client.orgName,
      verifiedPayer: job.client.verifiedPayer,
      ratingAvg: job.client.ratingAvg,
    },
  };
}

// ── POST /jobs ── (зөвхөн client профайлтай, идэвхтэй хэрэглэгч — RBAC + ABAC)
router.post('/', requireAuth, requireActiveUser, requireClientProfile, async (req, res, next) => {
  try {
    const { data, error } = validate(jobCreateSchema, req.body);
    if (error) return res.status(400).json({ error });

    // FR-2.3: гарчиг/тайлбарт холбоо барих мэдээлэл илэрвэл нийтлэгдэхийн
    // өмнө admin-ий хяналтад орно (бусад бүх зар шууд APPROVED).
    const leak = detectLeakage(`${data.title} ${data.description}`);
    const moderationStatus = leak.flagged ? 'PENDING' : 'APPROVED';
    const moderationReason = leak.flagged ? `Илэрсэн: ${leak.reasons.join(', ')}` : null;

    const job = await prisma.job.create({
      data: { ...data, clientId: req.clientProfile.id, moderationStatus, moderationReason },
      include: clientInclude,
    });
    await prisma.clientProfile.update({
      where: { id: req.clientProfile.id },
      data: { jobsPosted: { increment: 1 } },
    });

    res.status(201).json(publicJob(job));
    logEvent('job_posted', { jobId: job.id, moderationStatus });

    prisma.user.findUnique({ where: { id: req.user.id }, select: { email: true, name: true } })
      .then((owner) => owner && sendMail({
        to: owner.email,
        subject: `Таны "${job.title}" зар нийтлэгдлээ`,
        html: `<p>Сайн байна уу, ${owner.name || 'найз'}!</p><p>Таны <b>${job.title}</b> зар KREATIV дээр амжилттай нийтлэгдэж, freelancer-үүдэд харагдаж эхэллээ.</p>`,
      }))
      .catch(() => {});
    createNotification({
      userId: req.user.id,
      type: 'job',
      text: moderationStatus === 'PENDING'
        ? `Таны "${job.title}" зар админы хяналтад орлоо (холбоо барих мэдээлэл илэрсэн тул)`
        : `Таны "${job.title}" зар нийтлэгдлээ`,
      link: 'my-projects',
    });

    // FR-1.1 / FR-2.4: ур чадвар тохирсон freelancer-үүдэд мэдэгдэл (шууд
    // нийтлэгдсэн үед л). Ур чадвар давхцал + үнэлгээ + төсөвт таарах эсэхээр
    // онооны дагуу эрэмбэлж, хамгийн тохирох Топ 5-д тусгай "invite" (шууд
    // урилга) илгээж, үлдсэн тохирогчдод ердийн "шинэ зар" мэдэгдэл явуулна —
    // "invite" мэдэгдлийн төрөл frontend дээр аль хэдийн тодорхойлогдсон
    // байсан ч энэ өдрийг хүртэл хэзээ ч ашиглагдаагүй байсан.
    if (moderationStatus === 'APPROVED' && job.skills.length) {
      prisma.freelancerProfile.findMany({
        where: { skills: { hasSome: job.skills } },
        select: { userId: true, skills: true, ratingAvg: true, priceMin: true },
        take: 200,
      }).then((matches) => {
        const scored = matches
          .filter((m) => m.userId !== req.user.id)
          .map((m) => {
            const overlap = m.skills.filter((s) => job.skills.includes(s)).length;
            const budgetFit = job.budgetMax && m.priceMin != null && m.priceMin <= job.budgetMax ? 1 : 0;
            return { ...m, score: overlap * 10 + m.ratingAvg * 3 + budgetFit * 5 };
          })
          .sort((a, b) => b.score - a.score);

        const invited = scored.slice(0, 5);
        const rest = scored.slice(5, 50);

        for (const m of invited) {
          createNotification({
            userId: m.userId,
            type: 'invite',
            text: `You're a top match for "${job.title}" — the client's brief lines up closely with your skills. Send a proposal before the rest of the pool sees it.`,
            link: 'find-work',
          });
        }
        for (const m of rest) {
          createNotification({
            userId: m.userId,
            type: 'job',
            text: `Таны ур чадварт тохирох шинэ зар: "${job.title}"`,
            link: 'find-work',
          });
        }
      }).catch(() => {});
    }
  } catch (err) {
    next(err);
  }
});

// ── GET /jobs/mine ── (өөрийн бүх зар, статусаас үл хамааран)
router.get('/mine', requireAuth, requireClientProfile, async (req, res, next) => {
  try {
    const jobs = await prisma.job.findMany({
      where: { clientId: req.clientProfile.id },
      include: clientInclude,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ jobs: jobs.map(publicJob) });
  } catch (err) {
    next(err);
  }
});

// ── GET /jobs ── (нийтэд, search + filter + pagination)
router.get('/', async (req, res, next) => {
  try {
    const { data, error } = validate(jobQuerySchema, req.query);
    if (error) return res.status(400).json({ error });

    const and = [{ status: data.status || 'OPEN' }, { moderationStatus: 'APPROVED' }];
    if (data.category) and.push({ category: data.category });
    if (data.type) and.push({ budgetType: data.type });
    if (data.skills) {
      const list = data.skills.split(',').map((s) => s.trim()).filter(Boolean);
      if (list.length) and.push({ skills: { hasSome: list } });
    }
    if (data.q) {
      and.push({
        OR: [
          { title: { contains: data.q, mode: 'insensitive' } },
          { description: { contains: data.q, mode: 'insensitive' } },
        ],
      });
    }
    // Төсвийн шүүлт: хайлтын мужтай давхцаж буй зар бүр тохирно
    if (data.minBudget != null) {
      and.push({ OR: [{ budgetMax: null }, { budgetMax: { gte: data.minBudget } }] });
    }
    if (data.maxBudget != null) {
      and.push({ OR: [{ budgetMin: null }, { budgetMin: { lte: data.maxBudget } }] });
    }

    const where = { AND: and };
    const skip = (data.page - 1) * data.pageSize;

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        include: clientInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take: data.pageSize,
      }),
      prisma.job.count({ where }),
    ]);

    res.json({
      jobs: jobs.map(publicJob),
      total,
      page: data.page,
      pageSize: data.pageSize,
      totalPages: Math.max(1, Math.ceil(total / data.pageSize)),
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /jobs/:id ──
router.get('/:id', async (req, res, next) => {
  try {
    const job = await prisma.job.findUnique({ where: { id: req.params.id }, include: clientInclude });
    if (!job) return res.status(404).json({ error: 'Олдсонгүй' });
    res.json(publicJob(job));
  } catch (err) {
    next(err);
  }
});

// ── PATCH /jobs/:id ── (эзэмшигч л засварлана)
router.patch('/:id', requireAuth, requireClientProfile, async (req, res, next) => {
  try {
    const existing = await prisma.job.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Олдсонгүй' });
    if (existing.clientId !== req.clientProfile.id) {
      return res.status(403).json({ error: 'Энэ зарыг засах эрхгүй' });
    }
    const blockReason = jobEditBlockReason(existing);
    if (blockReason) return res.status(409).json({ error: blockReason });

    const { data, error } = validate(jobUpdateSchema, req.body);
    if (error) return res.status(400).json({ error });

    const job = await prisma.job.update({
      where: { id: req.params.id },
      data,
      include: clientInclude,
    });
    res.json(publicJob(job));
  } catch (err) {
    next(err);
  }
});

// ── DELETE /jobs/:id ── (эзэмшигч л устгана)
router.delete('/:id', requireAuth, requireClientProfile, async (req, res, next) => {
  try {
    const existing = await prisma.job.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Олдсонгүй' });
    if (existing.clientId !== req.clientProfile.id) {
      return res.status(403).json({ error: 'Энэ зарыг устгах эрхгүй' });
    }
    const blockReason = jobDeleteBlockReason(existing);
    if (blockReason) return res.status(409).json({ error: blockReason });

    await prisma.job.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// ── Proposals (PRD FR-3) ──

// ── POST /jobs/:id/proposals ── (freelancer санал илгээнэ)
router.post('/:id/proposals', requireAuth, requireActiveUser, async (req, res, next) => {
  try {
    const freelancerProfile = await prisma.freelancerProfile.findUnique({ where: { userId: req.user.id } });
    if (!freelancerProfile) {
      return res.status(403).json({ error: 'Санал илгээхийн тулд эхлээд freelancer профайлаа үүсгэнэ үү' });
    }

    const job = await prisma.job.findUnique({ where: { id: req.params.id } });
    if (!job) return res.status(404).json({ error: 'Олдсонгүй' });
    if (job.status !== 'OPEN') return res.status(409).json({ error: 'Энэ зар одоогоор санал хүлээж авахгүй байна' });
    if (job.moderationStatus !== 'APPROVED') return res.status(409).json({ error: 'Энэ зар админы хяналтад байгаа тул санал хүлээж авахгүй байна' });

    const { data, error } = validate(proposalCreateSchema, req.body);
    if (error) return res.status(400).json({ error });

    const existing = await prisma.proposal.findUnique({
      where: { jobId_freelancerId: { jobId: job.id, freelancerId: freelancerProfile.id } },
    });
    if (existing) return res.status(409).json({ error: 'Та энэ зард аль хэдийн санал илгээсэн байна' });

    // FR-3.3: сарын үнэгүй саналын хязгаар (спам бууруулах)
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const usedThisMonth = await prisma.proposal.count({
      where: { freelancerId: freelancerProfile.id, createdAt: { gte: monthStart } },
    });
    if (usedThisMonth >= FREE_PROPOSALS_PER_MONTH) {
      return res.status(429).json({ error: `Энэ сарын үнэгүй саналын хязгаар (${FREE_PROPOSALS_PER_MONTH}) дүүрлээ. Дараа сар дахин оролдоно уу.` });
    }

    // FR-3.4: cover letter-т холбоо барих мэдээлэл илэрвэл анхааруулна (блоклохгүй)
    const leak = detectLeakage(data.coverLetter);

    const proposal = await prisma.proposal.create({
      data: { jobId: job.id, freelancerId: freelancerProfile.id, ...data },
    });

    res.status(201).json({
      ...publicProposal({ ...proposal, freelancer: null }),
      leakageWarning: leak.flagged ? leak.reasons : null,
      proposalsRemainingThisMonth: FREE_PROPOSALS_PER_MONTH - usedThisMonth - 1,
    });
    logEvent('proposal_submitted', { jobId: job.id, freelancerId: freelancerProfile.id });

    prisma.clientProfile.findUnique({ where: { id: job.clientId }, select: { userId: true } })
      .then((client) => client && createNotification({
        userId: client.userId,
        type: 'job',
        text: `Таны "${job.title}" зард шинэ санал ирлээ`,
        link: 'my-projects',
      }))
      .catch(() => {});
  } catch (err) {
    next(err);
  }
});

// ── GET /jobs/:id/proposals ── (зөвхөн зарын эзэмшигч client)
router.get('/:id/proposals', requireAuth, requireClientProfile, async (req, res, next) => {
  try {
    const job = await prisma.job.findUnique({ where: { id: req.params.id } });
    if (!job) return res.status(404).json({ error: 'Олдсонгүй' });
    if (job.clientId !== req.clientProfile.id) return res.status(403).json({ error: 'Хандах эрхгүй' });

    const proposals = await prisma.proposal.findMany({
      where: { jobId: job.id },
      include: { freelancer: { include: { user: { select: { name: true, avatarUrl: true } } } } },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ proposals: proposals.map(publicProposal) });
  } catch (err) {
    next(err);
  }
});

export default router;
