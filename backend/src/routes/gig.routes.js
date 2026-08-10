// FR-9: Gig — Fiverr-маягийн бэлэн, fixed-price үйлчилгээ. Freelancer
// урьдчилж зарлаж тавьдаг, client шууд захиалдаг (job/proposal шатгүй).
// Захиалга ирэхэд дотор нь Job+Proposal-ыг автоматаар үүсгээд, ЯГ ХЭВИЙН
// Contract/Milestone/escrow урсгал руу шилжүүлнэ — /contracts/*,
// /milestones/*-ийн аль хэдийн шалгагдсан логикийг дахин бичихгүй.
import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { requireAuth, requireClientProfile } from '../middleware/auth.js';
import { uploadPortfolioImage } from '../middleware/upload.js';
import { saveUpload } from '../lib/storage.js';
import { gigCreateSchema, gigUpdateSchema, gigQuerySchema } from '../validators/gig.schema.js';
import { createNotification } from './notification.routes.js';
import { logEvent } from '../lib/logger.js';

const router = Router();

function validate(schema, body) {
  const result = schema.safeParse(body);
  if (!result.success) return { error: result.error.issues.map((i) => i.message) };
  return { data: result.data };
}

function publicGig(gig, stats) {
  return {
    id: gig.id,
    title: gig.title,
    description: gig.description,
    category: gig.category,
    price: gig.price,
    deliveryDays: gig.deliveryDays,
    images: gig.images,
    active: gig.active,
    createdAt: gig.createdAt,
    ordersCount: stats?.ordersCount ?? 0,
    ratingAvg: stats?.ratingAvg ?? 0,
    reviewCount: stats?.reviewCount ?? 0,
    freelancer: {
      id: gig.freelancer.id,
      userId: gig.freelancer.userId,
      name: gig.freelancer.user.name,
      avatarUrl: gig.freelancer.user.avatarUrl,
      ratingAvg: gig.freelancer.ratingAvg,
      jobsCompleted: gig.freelancer.jobsCompleted,
      verified: gig.freelancer.verificationStatus === 'VERIFIED',
    },
  };
}

// Тухайн gig-үүдийн захиалгын тоо (Job.gigId-аар) болон дундаж үнэлгээ
// (client-ийн freelancer-т өгсөн Review — revieweeId = freelancer.userId)
// нэг дор batch-ээр тооцно, N+1 query-ээс сэргийлнэ.
async function gigStatsFor(gigs) {
  const gigIds = gigs.map((g) => g.id);
  if (!gigIds.length) return {};

  const jobs = await prisma.job.findMany({
    where: { gigId: { in: gigIds } },
    select: { id: true, gigId: true },
  });
  const stats = {};
  for (const g of gigs) stats[g.id] = { ordersCount: 0, ratingAvg: 0, reviewCount: 0 };
  for (const j of jobs) stats[j.gigId].ordersCount++;
  if (!jobs.length) return stats;

  const contracts = await prisma.contract.findMany({
    where: { jobId: { in: jobs.map((j) => j.id) } },
    select: { id: true, jobId: true },
  });
  const contractToGig = new Map();
  const jobToGig = new Map(jobs.map((j) => [j.id, j.gigId]));
  for (const c of contracts) contractToGig.set(c.id, jobToGig.get(c.jobId));
  if (!contracts.length) return stats;

  const freelancerUserIdByGig = new Map(gigs.map((g) => [g.id, g.freelancer.userId]));
  const reviews = await prisma.review.findMany({
    where: { contractId: { in: contracts.map((c) => c.id) } },
    select: { contractId: true, stars: true, revieweeId: true },
  });
  const sums = {};
  for (const r of reviews) {
    const gigId = contractToGig.get(r.contractId);
    if (!gigId || r.revieweeId !== freelancerUserIdByGig.get(gigId)) continue; // зөвхөн freelancer-ийг үнэлсэн review
    sums[gigId] = sums[gigId] || { sum: 0, count: 0 };
    sums[gigId].sum += r.stars;
    sums[gigId].count++;
  }
  for (const [gigId, { sum, count }] of Object.entries(sums)) {
    stats[gigId].reviewCount = count;
    stats[gigId].ratingAvg = Math.round((sum / count) * 10) / 10;
  }
  return stats;
}

async function loadOwnFreelancerProfile(userId) {
  return prisma.freelancerProfile.findUnique({ where: { userId } });
}

// ── POST /gigs/image ── (Settings-ийн portfolio upload-той ижил, зөвхөн upload)
router.post('/gigs/image', requireAuth, (req, res, next) => {
  uploadPortfolioImage(req, res, async (err) => {
    if (err) {
      const message = err.code === 'LIMIT_FILE_SIZE'
        ? 'Зургийн хэмжээ 5MB-с ихгүй байх ёстой'
        : err.message || 'Зураг оруулахад алдаа гарлаа';
      return res.status(400).json({ error: message });
    }
    if (!req.file) return res.status(400).json({ error: 'Зураг сонгогдоогүй байна' });
    try {
      const url = await saveUpload('gigs', req.user.id, req.file);
      res.json({ url });
    } catch (e) {
      next(e);
    }
  });
});

// ── POST /gigs ── (үүсгэх, freelancer л)
router.post('/gigs', requireAuth, async (req, res, next) => {
  try {
    const profile = await loadOwnFreelancerProfile(req.user.id);
    if (!profile) return res.status(400).json({ error: 'Эхлээд freelancer профайлаа үүсгэнэ үү' });

    const { data, error } = validate(gigCreateSchema, req.body);
    if (error) return res.status(400).json({ error });

    const gig = await prisma.gig.create({
      data: { ...data, freelancerId: profile.id },
      include: { freelancer: { include: { user: true } } },
    });
    res.status(201).json(publicGig(gig, { ordersCount: 0, ratingAvg: 0, reviewCount: 0 }));
  } catch (err) {
    next(err);
  }
});

// ── GET /gigs/mine ── (өөрийн gig-үүд, идэвхгүй ч оролцоно)
router.get('/gigs/mine', requireAuth, async (req, res, next) => {
  try {
    const profile = await loadOwnFreelancerProfile(req.user.id);
    if (!profile) return res.json({ gigs: [] });
    const gigs = await prisma.gig.findMany({
      where: { freelancerId: profile.id },
      include: { freelancer: { include: { user: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const stats = await gigStatsFor(gigs);
    res.json({ gigs: gigs.map((g) => publicGig(g, stats[g.id])) });
  } catch (err) {
    next(err);
  }
});

// ── GET /gigs ── (нийтэд — жагсаалт/хайлт)
router.get('/gigs', async (req, res, next) => {
  try {
    const { data, error } = validate(gigQuerySchema, req.query);
    if (error) return res.status(400).json({ error });

    const and = [{ active: true }];
    if (data.category) and.push({ category: data.category });
    if (data.q) {
      and.push({
        OR: [
          { title: { contains: data.q, mode: 'insensitive' } },
          { description: { contains: data.q, mode: 'insensitive' } },
        ],
      });
    }

    const orderBy =
      data.sort === 'priceLow' ? [{ price: 'asc' }]
      : data.sort === 'priceHigh' ? [{ price: 'desc' }]
      : data.sort === 'newest' ? [{ createdAt: 'desc' }]
      : [{ createdAt: 'desc' }];

    const where = { AND: and };
    const skip = (data.page - 1) * data.pageSize;
    const [gigs, total] = await Promise.all([
      prisma.gig.findMany({
        where,
        include: { freelancer: { include: { user: true } } },
        orderBy,
        skip,
        take: data.pageSize,
      }),
      prisma.gig.count({ where }),
    ]);
    const stats = await gigStatsFor(gigs);

    res.json({
      gigs: gigs.map((g) => publicGig(g, stats[g.id])),
      total,
      page: data.page,
      pageSize: data.pageSize,
      totalPages: Math.max(1, Math.ceil(total / data.pageSize)),
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /gigs/:id ── (нийтэд)
router.get('/gigs/:id', async (req, res, next) => {
  try {
    const gig = await prisma.gig.findUnique({
      where: { id: req.params.id },
      include: { freelancer: { include: { user: true } } },
    });
    if (!gig || !gig.active) return res.status(404).json({ error: 'Олдсонгүй' });
    const stats = await gigStatsFor([gig]);
    res.json(publicGig(gig, stats[gig.id]));
  } catch (err) {
    next(err);
  }
});

// ── PATCH /gigs/:id ── (эзэмшигч л)
router.patch('/gigs/:id', requireAuth, async (req, res, next) => {
  try {
    const gig = await prisma.gig.findUnique({ where: { id: req.params.id }, include: { freelancer: true } });
    if (!gig || gig.freelancer.userId !== req.user.id) return res.status(404).json({ error: 'Олдсонгүй' });

    const { data, error } = validate(gigUpdateSchema, req.body);
    if (error) return res.status(400).json({ error });

    const updated = await prisma.gig.update({
      where: { id: gig.id },
      data,
      include: { freelancer: { include: { user: true } } },
    });
    const stats = await gigStatsFor([updated]);
    res.json(publicGig(updated, stats[updated.id]));
  } catch (err) {
    next(err);
  }
});

// ── DELETE /gigs/:id ── (эзэмшигч л)
router.delete('/gigs/:id', requireAuth, async (req, res, next) => {
  try {
    const gig = await prisma.gig.findUnique({ where: { id: req.params.id }, include: { freelancer: true } });
    if (!gig || gig.freelancer.userId !== req.user.id) return res.status(404).json({ error: 'Олдсонгүй' });
    await prisma.gig.delete({ where: { id: gig.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// ── POST /gigs/:id/order ── (client захиална — Job+Proposal+Contract+Milestone-ыг
// нэг гүйлгээнд автоматаар үүсгээд, хэвийн escrow урсгал руу шилжүүлнэ)
router.post('/gigs/:id/order', requireAuth, requireClientProfile, async (req, res, next) => {
  try {
    const gig = await prisma.gig.findUnique({
      where: { id: req.params.id },
      include: { freelancer: { include: { user: true } } },
    });
    if (!gig || !gig.active) return res.status(404).json({ error: 'Олдсонгүй' });
    if (gig.freelancer.userId === req.user.id) {
      return res.status(400).json({ error: 'Өөрийн gig-ийг захиалж болохгүй' });
    }

    const contract = await prisma.$transaction(async (tx) => {
      const job = await tx.job.create({
        data: {
          clientId: req.clientProfile.id,
          title: gig.title,
          description: gig.description,
          category: gig.category,
          budgetType: 'FIXED',
          budgetMin: gig.price,
          budgetMax: gig.price,
          status: 'IN_PROGRESS',
          gigId: gig.id,
        },
      });
      const proposal = await tx.proposal.create({
        data: {
          jobId: job.id,
          freelancerId: gig.freelancerId,
          price: gig.price,
          durationDays: gig.deliveryDays,
          coverLetter: `Gig захиалга: "${gig.title}"`,
          status: 'ACCEPTED',
        },
      });
      const c = await tx.contract.create({
        data: {
          jobId: job.id,
          proposalId: proposal.id,
          clientId: req.clientProfile.id,
          freelancerId: gig.freelancerId,
          totalAmount: gig.price,
          milestones: { create: [{ title: gig.title, amount: gig.price, order: 0 }] },
        },
        include: { milestones: true, job: true, client: { include: { user: true } }, freelancer: { include: { user: true } } },
      });
      return c;
    });

    res.status(201).json({
      id: contract.id,
      jobId: contract.jobId,
      totalAmount: contract.totalAmount,
      milestones: contract.milestones,
    });
    logEvent('gig_ordered', { gigId: gig.id, contractId: contract.id, amount: gig.price });
    createNotification({
      userId: gig.freelancer.userId,
      type: 'job',
      text: `"${gig.title}" gig-ийг ${req.clientProfile.orgName || 'client'} захиаллаа`,
      link: 'my-projects',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
