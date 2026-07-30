import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { uploadAvatar } from '../middleware/upload.js';
import {
  freelancerProfileSchema,
  clientProfileSchema,
  portfolioItemSchema,
} from '../validators/profile.schema.js';

const router = Router();

function validate(schema, body) {
  const result = schema.safeParse(body);
  if (!result.success) {
    return { error: result.error.issues.map((i) => i.message) };
  }
  return { data: result.data };
}

// FR-1.5: профайлын бүрэн байдал — хадгалаагүй, хүсэлт бүрт тооцно
// (талбар бүрийг дахин тооцох синк-ын асуудлаас зайлсхийнэ).
function freelancerCompleteness(profile) {
  const checks = [
    !!profile.headline,
    !!profile.bio,
    profile.skills.length > 0,
    profile.priceMin != null && profile.priceMax != null,
    profile.portfolio?.length > 0,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function clientCompleteness(profile) {
  return profile.orgName ? 100 : 50;
}

// ── POST /profile/avatar ── (зураг оруулах — Day 7 File Upload)
router.post('/avatar', requireAuth, (req, res, next) => {
  uploadAvatar(req, res, async (err) => {
    if (err) {
      const message = err.code === 'LIMIT_FILE_SIZE'
        ? 'Файлын хэмжээ 2MB-с ихгүй байх ёстой'
        : err.message || 'Зураг оруулахад алдаа гарлаа';
      return res.status(400).json({ error: message });
    }
    if (!req.file) return res.status(400).json({ error: 'Зураг сонгогдоогүй байна' });

    try {
      const avatarUrl = `/uploads/avatars/${req.file.filename}`;
      const user = await prisma.user.update({
        where: { id: req.user.id },
        data: { avatarUrl },
        select: { id: true, email: true, name: true, phone: true, avatarUrl: true, role: true },
      });
      res.json(user);
    } catch (e) {
      next(e);
    }
  });
});

// ── POST /profile/freelancer ── (үүсгэх/шинэчлэх, upsert)
router.post('/freelancer', requireAuth, async (req, res, next) => {
  try {
    const { data, error } = validate(freelancerProfileSchema, req.body);
    if (error) return res.status(400).json({ error });

    const profile = await prisma.freelancerProfile.upsert({
      where: { userId: req.user.id },
      update: data,
      create: { userId: req.user.id, ...data },
      include: { portfolio: true },
    });

    res.json({ ...profile, completeness: freelancerCompleteness(profile) });
  } catch (err) {
    next(err);
  }
});

// ── GET /profile/freelancer/me ──
router.get('/freelancer/me', requireAuth, async (req, res, next) => {
  try {
    const profile = await prisma.freelancerProfile.findUnique({
      where: { userId: req.user.id },
      include: { portfolio: true },
    });
    if (!profile) return res.status(404).json({ error: 'Freelancer профайл байхгүй байна' });
    res.json({ ...profile, completeness: freelancerCompleteness(profile) });
  } catch (err) {
    next(err);
  }
});

// ── GET /profile/freelancer/:userId ── (нийтэд харагдах)
router.get('/freelancer/:userId', async (req, res, next) => {
  try {
    const profile = await prisma.freelancerProfile.findUnique({
      where: { userId: req.params.userId },
      include: {
        portfolio: true,
        user: { select: { id: true, name: true } },
      },
    });
    if (!profile) return res.status(404).json({ error: 'Олдсонгүй' });
    res.json({ ...profile, completeness: freelancerCompleteness(profile) });
  } catch (err) {
    next(err);
  }
});

// ── POST /profile/freelancer/portfolio ── (portfolio item нэмэх)
router.post('/freelancer/portfolio', requireAuth, async (req, res, next) => {
  try {
    const { data, error } = validate(portfolioItemSchema, req.body);
    if (error) return res.status(400).json({ error });

    const profile = await prisma.freelancerProfile.findUnique({ where: { userId: req.user.id } });
    if (!profile) {
      return res.status(400).json({ error: 'Эхлээд freelancer профайлаа үүсгэнэ үү' });
    }

    const item = await prisma.portfolioItem.create({
      data: { ...data, freelancerId: profile.id },
    });
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
});

// ── DELETE /profile/freelancer/portfolio/:id ──
router.delete('/freelancer/portfolio/:id', requireAuth, async (req, res, next) => {
  try {
    const item = await prisma.portfolioItem.findUnique({
      where: { id: req.params.id },
      include: { freelancer: true },
    });
    if (!item || item.freelancer.userId !== req.user.id) {
      return res.status(404).json({ error: 'Олдсонгүй' });
    }
    await prisma.portfolioItem.delete({ where: { id: item.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// ── POST /profile/client ── (үүсгэх/шинэчлэх, upsert)
router.post('/client', requireAuth, async (req, res, next) => {
  try {
    const { data, error } = validate(clientProfileSchema, req.body);
    if (error) return res.status(400).json({ error });

    const profile = await prisma.clientProfile.upsert({
      where: { userId: req.user.id },
      update: data,
      create: { userId: req.user.id, ...data },
    });

    res.json({ ...profile, completeness: clientCompleteness(profile) });
  } catch (err) {
    next(err);
  }
});

// ── GET /profile/client/me ──
router.get('/client/me', requireAuth, async (req, res, next) => {
  try {
    const profile = await prisma.clientProfile.findUnique({ where: { userId: req.user.id } });
    if (!profile) return res.status(404).json({ error: 'Client профайл байхгүй байна' });
    res.json({ ...profile, completeness: clientCompleteness(profile) });
  } catch (err) {
    next(err);
  }
});

// ── GET /profile/client/:userId ── (нийтэд харагдах)
router.get('/client/:userId', async (req, res, next) => {
  try {
    const profile = await prisma.clientProfile.findUnique({
      where: { userId: req.params.userId },
      include: { user: { select: { id: true, name: true } } },
    });
    if (!profile) return res.status(404).json({ error: 'Олдсонгүй' });
    res.json({ ...profile, completeness: clientCompleteness(profile) });
  } catch (err) {
    next(err);
  }
});

export default router;