import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { requireAuth, requireClientProfile } from '../middleware/auth.js';
import { requireActiveUser, jobEditBlockReason, jobDeleteBlockReason } from '../middleware/abac.js';
import { jobCreateSchema, jobUpdateSchema, jobQuerySchema } from '../validators/job.schema.js';
import { proposalCreateSchema } from '../validators/contract.schema.js';
import { sendMail } from '../lib/mailer.js';
import { createNotification } from './notification.routes.js';

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

    const job = await prisma.job.create({
      data: { ...data, clientId: req.clientProfile.id },
      include: clientInclude,
    });
    await prisma.clientProfile.update({
      where: { id: req.clientProfile.id },
      data: { jobsPosted: { increment: 1 } },
    });

    res.status(201).json(publicJob(job));

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
      text: `Таны "${job.title}" зар нийтлэгдлээ`,
      link: 'my-projects',
    });
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

    const and = [{ status: data.status || 'OPEN' }];
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

    const { data, error } = validate(proposalCreateSchema, req.body);
    if (error) return res.status(400).json({ error });

    const existing = await prisma.proposal.findUnique({
      where: { jobId_freelancerId: { jobId: job.id, freelancerId: freelancerProfile.id } },
    });
    if (existing) return res.status(409).json({ error: 'Та энэ зард аль хэдийн санал илгээсэн байна' });

    const proposal = await prisma.proposal.create({
      data: { jobId: job.id, freelancerId: freelancerProfile.id, ...data },
    });

    res.status(201).json(publicProposal({ ...proposal, freelancer: null }));

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
