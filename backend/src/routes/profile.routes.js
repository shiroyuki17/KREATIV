import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { uploadAvatar, uploadPortfolioImage } from '../middleware/upload.js';
import { saveUpload, deleteUpload } from '../lib/storage.js';
import {
  freelancerProfileSchema,
  freelancerQuerySchema,
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

// Card/list-д хэрэгтэй хэсгийг л дамжуулна — TALENT mock-ийн шиг "earned"/
// "followers"/"available" зэрэг тал нь бодит DB-д байдаггүй тул огт хайлгахгүй
// (байхгүй утгыг зохиомлоор дүүргэхээс илүү, frontend үүнийг харгалзан UI-аа
// тохируулна — ProjectDetail.jsx-ийн real-vs-mock normalize() хэв маягтай адил).
function publicFreelancer(profile) {
  return {
    id: profile.id,
    userId: profile.userId,
    name: profile.user?.name,
    avatarUrl: profile.user?.avatarUrl,
    headline: profile.headline,
    bio: profile.bio,
    category: profile.category,
    skills: profile.skills,
    priceMin: profile.priceMin,
    priceMax: profile.priceMax,
    ratingAvg: profile.ratingAvg,
    jobsCompleted: profile.jobsCompleted,
    // FR-5.1: зөвхөн "VERIFIED" эсэхийг л нийтэд харуулна — evidence/note нь
    // хувийн (зөвхөн эзэн нь болон админ харна).
    verified: profile.verificationStatus === 'VERIFIED',
    portfolio: (profile.portfolio || []).slice(0, 4).map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      link: p.link,
      images: p.images || [],
    })),
  };
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

// FR-7.4: маргааны хувь профайлд нөлөөлнө (маргаан ихтэй хэрэглэгч тодорно)
async function freelancerDisputeRate(freelancerId) {
  const [totalContracts, disputedContracts] = await Promise.all([
    prisma.contract.count({ where: { freelancerId } }),
    prisma.contract.count({ where: { freelancerId, milestones: { some: { dispute: { isNot: null } } } } }),
  ]);
  return totalContracts === 0 ? 0 : Math.round((disputedContracts / totalContracts) * 100);
}

// ── PATCH /profile/account ── (нэрээ солих)
//
// Өмнө нь User.name-ыг өөрчлөх ямар ч зам байгаагүй: Settings дээрх талбар
// disabled, "нэр солихын тулд support-тай холбогдоно уу" гэсэн тайлбартай
// байсан ч тийм support суваг ч байхгүй. Google-ээр нэвтэрсэн хэрэглэгчийн
// нэр Google дээрхээрээ тогтдог тул энэ нь бодит асуудал байв.
router.patch('/account', requireAuth, async (req, res, next) => {
  try {
    const name = String(req.body?.name || '').trim();
    if (name.length < 2 || name.length > 60) {
      return res.status(400).json({ error: 'Нэр 2-60 тэмдэгт байх ёстой' });
    }
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { name },
      select: { id: true, email: true, name: true, avatarUrl: true, role: true },
    });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

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
      // Хуучин аватарыг санаж авна — шинийг амжилттай хадгалсны дараа л
      // устгана (эсрэгээр хийвэл шинэ нь амжилтгүй болоход хэрэглэгч
      // аватаргүй үлдэнэ).
      const previous = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { avatarUrl: true },
      });

      const avatarUrl = await saveUpload('avatars', req.user.id, req.file);
      const user = await prisma.user.update({
        where: { id: req.user.id },
        data: { avatarUrl },
        select: { id: true, email: true, name: true, phone: true, avatarUrl: true, role: true },
      });

      // Google-ийн профайл зураг (гадаад https:// хаяг) бол манайх биш —
      // устгах гэж оролдохгүй.
      if (previous?.avatarUrl && previous.avatarUrl !== avatarUrl && !/^https?:\/\//.test(previous.avatarUrl)) {
        deleteUpload(previous.avatarUrl);
      }

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

// ── GET /profile/freelancers ── (нийтэд, Find Talent-ийн бодит хайлт/шүүлт)
router.get('/freelancers', async (req, res, next) => {
  try {
    const { data, error } = validate(freelancerQuerySchema, req.query);
    if (error) return res.status(400).json({ error });

    const and = [{ headline: { not: null } }]; // онбоардинг дуусаагүй "хоосон" профайл алгасна
    if (data.category) and.push({ category: data.category });
    if (data.skills) {
      const list = data.skills.split(',').map((s) => s.trim()).filter(Boolean);
      if (list.length) and.push({ skills: { hasSome: list } });
    }
    if (data.q) {
      and.push({
        OR: [
          { headline: { contains: data.q, mode: 'insensitive' } },
          { bio: { contains: data.q, mode: 'insensitive' } },
          { skills: { has: data.q } },
        ],
      });
    }

    const where = { AND: and };
    const skip = (data.page - 1) * data.pageSize;
    const orderBy =
      data.sort === 'rateLow' ? [{ priceMin: 'asc' }]
      : data.sort === 'rateHigh' ? [{ priceMin: 'desc' }]
      : data.sort === 'rating' ? [{ ratingAvg: 'desc' }]
      : [{ ratingAvg: 'desc' }, { jobsCompleted: 'desc' }];

    const [profiles, total] = await Promise.all([
      prisma.freelancerProfile.findMany({
        where,
        include: { user: { select: { name: true, avatarUrl: true } }, portfolio: true },
        orderBy,
        skip,
        take: data.pageSize,
      }),
      prisma.freelancerProfile.count({ where }),
    ]);

    res.json({
      freelancers: profiles.map(publicFreelancer),
      total,
      page: data.page,
      pageSize: data.pageSize,
      totalPages: Math.max(1, Math.ceil(total / data.pageSize)),
    });
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
    res.json({ ...profile, completeness: freelancerCompleteness(profile), disputeRate: await freelancerDisputeRate(profile.id) });
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
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
    });
    if (!profile) return res.status(404).json({ error: 'Олдсонгүй' });
    // verificationEvidence/verificationNote нь хувийн (эзэн+админ л харна) —
    // нийтэд харагдах endpoint-оос заавал хасна, зөвхөн эцсийн "verified" bool-ыг үлдээнэ.
    const { verificationEvidence, verificationNote, ...publicProfile } = profile;
    res.json({
      ...publicProfile,
      verified: profile.verificationStatus === 'VERIFIED',
      completeness: freelancerCompleteness(profile),
      disputeRate: await freelancerDisputeRate(profile.id),
    });
  } catch (err) {
    next(err);
  }
});

// ── Дагах (Follow) ──
// FindTalent/FreelancerProfile дээрх "Follow" товч нь өмнө нь onClick ч
// байхгүй, зөвхөн харагдах зорилготой байв. Одоо бодит хавчуурга.

// ── POST /profile/follows ── body: { userId }
router.post('/follows', requireAuth, async (req, res, next) => {
  try {
    const targetId = req.body?.userId;
    if (!targetId || targetId === req.user.id) {
      return res.status(400).json({ error: 'Буруу хэрэглэгч' });
    }
    const target = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true } });
    if (!target) return res.status(404).json({ error: 'Хэрэглэгч олдсонгүй' });

    // Давхар дарахад 409 өгөхгүй — үр дүн ижил (idempotent).
    await prisma.follow.upsert({
      where: { followerId_followingId: { followerId: req.user.id, followingId: targetId } },
      update: {},
      create: { followerId: req.user.id, followingId: targetId },
    });
    const followerCount = await prisma.follow.count({ where: { followingId: targetId } });
    res.status(201).json({ following: true, userId: targetId, followerCount });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /profile/follows/:userId ──
router.delete('/follows/:userId', requireAuth, async (req, res, next) => {
  try {
    await prisma.follow.deleteMany({
      where: { followerId: req.user.id, followingId: req.params.userId },
    });
    const followerCount = await prisma.follow.count({ where: { followingId: req.params.userId } });
    res.json({ following: false, userId: req.params.userId, followerCount });
  } catch (err) {
    next(err);
  }
});

// ── GET /profile/follows/mine ── (миний дагаж байгаа бүх userId)
// Жагсаалтын хуудсууд нэг дуудлагаар бүх товчны төлөвийг мэдэхэд хэрэглэнэ.
router.get('/follows/mine', requireAuth, async (req, res, next) => {
  try {
    const rows = await prisma.follow.findMany({
      where: { followerId: req.user.id },
      select: { followingId: true },
    });
    res.json({ following: rows.map((r) => r.followingId) });
  } catch (err) {
    next(err);
  }
});

// ── POST /profile/freelancer/portfolio/image ── (portfolio-д зориулсан зураг оруулах, URL буцаана)
router.post('/freelancer/portfolio/image', requireAuth, (req, res, next) => {
  uploadPortfolioImage(req, res, async (err) => {
    if (err) {
      const message = err.code === 'LIMIT_FILE_SIZE'
        ? 'Зургийн хэмжээ 5MB-с ихгүй байх ёстой'
        : err.message || 'Зураг оруулахад алдаа гарлаа';
      return res.status(400).json({ error: message });
    }
    if (!req.file) return res.status(400).json({ error: 'Зураг сонгогдоогүй байна' });
    try {
      const url = await saveUpload('portfolio', req.user.id, req.file);
      res.json({ url });
    } catch (e) {
      next(e);
    }
  });
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

// ── POST /profile/freelancer/verification ── (FR-5.1: badge хүсэх)
router.post('/freelancer/verification', requireAuth, async (req, res, next) => {
  try {
    const evidence = String(req.body?.evidence || '').trim();
    if (evidence.length < 20) {
      return res.status(400).json({ error: 'Portfolio холбоос болон тайлбараа дор хаяж 20 тэмдэгтээр бичнэ үү' });
    }
    const profile = await prisma.freelancerProfile.findUnique({ where: { userId: req.user.id } });
    if (!profile) return res.status(400).json({ error: 'Эхлээд freelancer профайлаа үүсгэнэ үү' });
    if (profile.verificationStatus === 'VERIFIED') {
      return res.status(409).json({ error: 'Та аль хэдийн баталгаажсан байна' });
    }
    if (profile.verificationStatus === 'PENDING') {
      return res.status(409).json({ error: 'Таны хүсэлт хянагдаж байна' });
    }

    const updated = await prisma.freelancerProfile.update({
      where: { userId: req.user.id },
      data: {
        verificationStatus: 'PENDING',
        verificationEvidence: evidence,
        verificationNote: null,
        verificationRequestedAt: new Date(),
      },
    });
    res.json({ verificationStatus: updated.verificationStatus, verificationRequestedAt: updated.verificationRequestedAt });
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