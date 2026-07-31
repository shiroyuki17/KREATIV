// PRD FR-8 — Үнэлгээ. Зөвхөн ДУУССАН (COMPLETED) гэрээ дээр, оролцогч тал бүр
// нөгөөдөө нэг л удаа үнэлгээ өгнө.
import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { reviewCreateSchema } from '../validators/contract.schema.js';
import { createNotification } from './notification.routes.js';
import { logEvent } from '../lib/logger.js';

// FR-8.1: хоёр тал бие биенээ үнэлсний дараа ЭСВЭЛ гэрээ дууссанаас хойш
// 14 хоногийн дараа review-ууд зэрэг нээгдэнэ (нэг тал нөгөөгийнхөө
// сэтгэгдлийг харснаар өөрийн үнэлгээгээ өнгөөр нь бичихээс сэргийлнэ).
const REVEAL_AFTER_DAYS = 14;

const router = Router();

function validate(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) return { error: result.error.issues.map((i) => i.message) };
  return { data: result.data };
}

// ── POST /contracts/:id/reviews ──
router.post('/contracts/:id/reviews', requireAuth, async (req, res, next) => {
  try {
    const contract = await prisma.contract.findUnique({
      where: { id: req.params.id },
      include: { client: true, freelancer: true },
    });
    if (!contract) return res.status(404).json({ error: 'Олдсонгүй' });
    if (contract.status !== 'COMPLETED') return res.status(409).json({ error: 'Зөвхөн дууссан гэрээнд үнэлгээ өгнө' });

    const isClient = contract.client.userId === req.user.id;
    const isFreelancer = contract.freelancer.userId === req.user.id;
    if (!isClient && !isFreelancer) return res.status(403).json({ error: 'Хандах эрхгүй' });

    const { data, error } = validate(reviewCreateSchema, req.body);
    if (error) return res.status(400).json({ error });

    const revieweeId = isClient ? contract.freelancer.userId : contract.client.userId;

    const review = await prisma.review.upsert({
      where: { contractId_reviewerId: { contractId: contract.id, reviewerId: req.user.id } },
      update: { stars: data.stars, comment: data.comment },
      create: { contractId: contract.id, reviewerId: req.user.id, revieweeId, stars: data.stars, comment: data.comment },
    });

    // Хүлээн авагчийн дундаж үнэлгээг дахин тооцно (freelancer эсвэл client аль нь ч байж болно)
    const revieweeReviews = await prisma.review.findMany({ where: { revieweeId }, select: { stars: true } });
    const avg = revieweeReviews.reduce((s, r) => s + r.stars, 0) / revieweeReviews.length;

    if (isClient) {
      await prisma.freelancerProfile.update({ where: { id: contract.freelancerId }, data: { ratingAvg: avg } });
    } else {
      await prisma.clientProfile.update({ where: { id: contract.clientId }, data: { ratingAvg: avg } });
    }

    res.status(201).json(review);
    logEvent('review_submitted', { contractId: contract.id, reviewerId: req.user.id, stars: data.stars });
    createNotification({
      userId: revieweeId,
      type: 'review',
      text: `Танд ${data.stars}★ үнэлгээ ирлээ`,
      link: 'profile',
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /reviews/for/:userId ── (нийтэд, тухайн хэрэглэгчийн хүлээн авсан үнэлгээ)
// FR-8.1: хоёр талын review зэрэг ирснээс хойш ЭСВЭЛ гэрээ дууссанаас
// 14 хоногийн дараа л харагдана (double-blind).
router.get('/reviews/for/:userId', async (req, res, next) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { revieweeId: req.params.userId },
      include: {
        reviewer: { select: { name: true } },
        contract: { select: { id: true, completedAt: true, job: { select: { title: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const contractIds = [...new Set(reviews.map((r) => r.contract.id))];
    const counts = await prisma.review.groupBy({ by: ['contractId'], where: { contractId: { in: contractIds } }, _count: true });
    const countByContract = Object.fromEntries(counts.map((c) => [c.contractId, c._count]));

    const now = Date.now();
    const revealed = reviews.filter((r) => {
      if (countByContract[r.contract.id] >= 2) return true;
      const completedAt = r.contract.completedAt;
      return completedAt && now - new Date(completedAt).getTime() >= REVEAL_AFTER_DAYS * 24 * 60 * 60 * 1000;
    });

    res.json({
      reviews: revealed.map((r) => ({
        id: r.id,
        stars: r.stars,
        comment: r.comment,
        createdAt: r.createdAt,
        reviewerName: r.reviewer?.name,
        jobTitle: r.contract?.job?.title,
      })),
      pendingCount: reviews.length - revealed.length,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
