import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { requireAuth, requireClientProfile } from '../middleware/auth.js';
import { jobCreateSchema, jobUpdateSchema, jobQuerySchema } from '../validators/job.schema.js';

const router = Router();

function validate(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) return { error: result.error.issues.map((i) => i.message) };
  return { data: result.data };
}

const clientInclude = { client: { include: { user: { select: { name: true } } } } };

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

// ── POST /jobs ── (зөвхөн client профайлтай хэрэглэгч, RBAC)
router.post('/', requireAuth, requireClientProfile, async (req, res, next) => {
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

    await prisma.job.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
