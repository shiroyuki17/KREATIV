// PRD FR-7 — Маргаан. Зөвхөн FUNDED/DELIVERED (escrow-той) milestone дээр
// нээгдэнэ; нээгдмэгц escrow царцаж (milestone.status = DISPUTED), админ
// шийдвэрлэх хүртэл fund/deliver/approve route-ууд үүн дээр ажиллахгүй.
import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { disputeCreateSchema } from '../validators/contract.schema.js';
import { createNotification } from './notification.routes.js';

const router = Router();

function validate(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) return { error: result.error.issues.map((i) => i.message) };
  return { data: result.data };
}

// ── POST /disputes ──
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { data, error } = validate(disputeCreateSchema, req.body);
    if (error) return res.status(400).json({ error });

    const milestone = await prisma.milestone.findUnique({ where: { id: data.milestoneId }, include: { contract: true } });
    if (!milestone) return res.status(404).json({ error: 'Олдсонгүй' });

    const [clientProfile, freelancerProfile] = await Promise.all([
      prisma.clientProfile.findUnique({ where: { userId: req.user.id } }),
      prisma.freelancerProfile.findUnique({ where: { userId: req.user.id } }),
    ]);
    const isParticipant = milestone.contract.clientId === clientProfile?.id || milestone.contract.freelancerId === freelancerProfile?.id;
    if (!isParticipant) return res.status(403).json({ error: 'Хандах эрхгүй' });

    if (!['FUNDED', 'DELIVERED'].includes(milestone.status)) {
      return res.status(409).json({ error: 'Энэ milestone дээр маргаан нээх боломжгүй (escrow-той байх ёстой)' });
    }
    const existing = await prisma.dispute.findUnique({ where: { milestoneId: milestone.id } });
    if (existing) return res.status(409).json({ error: 'Энэ milestone дээр аль хэдийн маргаан нээгдсэн байна' });

    const [dispute] = await prisma.$transaction([
      prisma.dispute.create({ data: { milestoneId: milestone.id, openedById: req.user.id, reason: data.reason } }),
      prisma.milestone.update({ where: { id: milestone.id }, data: { status: 'DISPUTED' } }),
    ]);

    res.status(201).json(dispute);
  } catch (err) {
    next(err);
  }
});

// ── GET /disputes/mine ──
router.get('/mine', requireAuth, async (req, res, next) => {
  try {
    const [clientProfile, freelancerProfile] = await Promise.all([
      prisma.clientProfile.findUnique({ where: { userId: req.user.id } }),
      prisma.freelancerProfile.findUnique({ where: { userId: req.user.id } }),
    ]);
    const contractFilter = [];
    if (clientProfile) contractFilter.push({ clientId: clientProfile.id });
    if (freelancerProfile) contractFilter.push({ freelancerId: freelancerProfile.id });
    if (contractFilter.length === 0) return res.json({ disputes: [] });

    const disputes = await prisma.dispute.findMany({
      where: { milestone: { contract: { OR: contractFilter } } },
      include: { milestone: { include: { contract: { include: { job: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ disputes });
  } catch (err) {
    next(err);
  }
});

export default router;
