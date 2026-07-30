// Admin Panel (Day 10 continuation) — жинхэнэ дата дээр ажилладаг хэсэг:
// хэрэглэгчийн удирдлага (isActive toggle нь ABAC-ийн requireActiveUser-тэй
// шууд холбогддог), signups/role статистик, бүх Transaction-ийн харагдац.
// Dispute/Escrow-per-job зэрэг бодит escrow-hire холбоос (Contract model)
// одоогоор байхгүй тул тэдгээрийг зохиомлоор дүүргэхийн оронд огт ороогүй.
import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth, requireRole('ADMIN'));

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function lastNMonths(n) {
  const now = new Date();
  const months = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth(), label: MONTH_LABELS[d.getMonth()] });
  }
  return months;
}

// ── GET /admin/stats ──
router.get('/stats', async (req, res, next) => {
  try {
    const [totalUsers, totalFreelancers, totalClients, totalAdmins, totalJobs, allUsers] = await Promise.all([
      prisma.user.count(),
      prisma.freelancerProfile.count(),
      prisma.clientProfile.count(),
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.job.count(),
      prisma.user.findMany({ select: { createdAt: true } }),
    ]);

    const months = lastNMonths(6);
    const signupsByMonth = months.map(({ year, month, label }) => ({
      month: label,
      count: allUsers.filter((u) => u.createdAt.getFullYear() === year && u.createdAt.getMonth() === month).length,
    }));

    res.json({
      totalUsers,
      totalFreelancers,
      totalClients,
      totalAdmins,
      totalJobs,
      signupsByMonth,
      roleDistribution: [
        { role: 'Freelancer', count: totalFreelancers },
        { role: 'Client', count: totalClients },
        { role: 'Admin', count: totalAdmins },
      ],
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /admin/users ── (хайлт/шүүлт)
router.get('/users', async (req, res, next) => {
  try {
    const { q, role } = req.query;
    const where = {};
    if (role && role !== 'All') where.role = role;
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true, name: true, email: true, role: true, isActive: true, createdAt: true,
        freelancerProfile: { select: { id: true } },
        clientProfile: { select: { id: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    res.json({
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        type: u.freelancerProfile ? 'Freelancer' : u.clientProfile ? 'Client' : 'Unassigned',
        isActive: u.isActive,
        createdAt: u.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /admin/users/:id/status ── (идэвхжүүлэх/түдгэлзүүлэх)
router.patch('/users/:id/status', async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'Өөрийн эрхийг өөрчлөх боломжгүй' });
    }
    const isActive = !!req.body?.isActive;
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive },
      select: { id: true, isActive: true },
    });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// ── GET /admin/transactions ── (платформ даяарх бүх Transaction)
router.get('/transactions', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize, 10) || 20));

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.transaction.count(),
    ]);

    res.json({ transactions, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) });
  } catch (err) {
    next(err);
  }
});

export default router;
