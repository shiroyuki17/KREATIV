// Admin Panel (Day 10 continuation) — жинхэнэ дата дээр ажилладаг хэсэг:
// хэрэглэгчийн удирдлага (isActive toggle нь ABAC-ийн requireActiveUser-тэй
// шууд холбогддог), signups/role статистик, бүх Transaction-ийн харагдац,
// маргааны шийдвэрлэлт (FR-7).
import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { disputeResolveSchema } from '../validators/contract.schema.js';
import { releaseMilestonePayment, maybeCompleteContract } from './contract.routes.js';
import { createNotification } from './notification.routes.js';
import { runReconciliation } from '../lib/reconcile.js';
import { PENDING_HOLD_DAYS } from '../lib/wallet.js';
import * as ai from '../lib/ai.js';
import * as stripe from '../lib/payments/stripe.js';
import * as gemini from '../lib/gemini.js';
import { smtpConfigured } from '../lib/mailer.js';
import { config } from '../config/env.js';

const router = Router();
router.use(requireAuth, requireRole('ADMIN'));

function validate(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) return { error: result.error.issues.map((i) => i.message) };
  return { data: result.data };
}

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
// ── GET /admin/integrations ──
// Аль гуравдагч үйлчилгээ БОДИТООР тохируулагдсаныг нэг дор харуулна.
// Үүнгүйгээр "имэйл ирэхгүй байна" гэх мэт асуудлыг оношлохын тулд Render
// dashboard руу орж env хувьсагч ширтэхээс өөр арга байхгүй байв.
// Түлхүүрийн УТГЫГ хэзээ ч буцаахгүй — зөвхөн тохируулагдсан эсэхийг.
router.get('/integrations', async (req, res, next) => {
  try {
    res.json({
      email: {
        configured: smtpConfigured(),
        // Тохируулаагүй үед имэйл Ethereal тест inbox руу очдог тул
        // хэрэглэгчийн жинхэнэ хайрцагт ХЭЗЭЭ Ч хүрэхгүй.
        mode: smtpConfigured() ? 'smtp' : 'ethereal-test-inbox',
        host: smtpConfigured() ? config.SMTP_HOST : null,
      },
      ai: {
        anthropic: !!config.ANTHROPIC_API_KEY,
        gemini: gemini.isConfigured(),
        anyConfigured: ai.isConfigured(),
      },
      payments: {
        stripe: stripe.isConfigured(),
        stripeTestMode: stripe.isConfigured() ? stripe.isTestMode() : null,
        stripeWebhook: !!config.STRIPE_WEBHOOK_SECRET,
        provider: config.PAYMENT_PROVIDER,
      },
      googleOauth: {
        configured: !!(config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET && config.GOOGLE_REDIRECT_URI),
        redirectUri: config.GOOGLE_REDIRECT_URI || null,
      },
      storage: { s3: !!config.S3_BUCKET },
    });
  } catch (err) {
    next(err);
  }
});

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

// ── GET /admin/disputes ──
router.get('/disputes', async (req, res, next) => {
  try {
    const disputes = await prisma.dispute.findMany({
      include: {
        openedBy: { select: { name: true, email: true } },
        milestone: {
          include: {
            contract: {
              include: {
                job: { select: { title: true } },
                client: { include: { user: { select: { name: true } } } },
                freelancer: { include: { user: { select: { name: true } } } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ disputes });
  } catch (err) {
    next(err);
  }
});

// ── GET /admin/disputes/:id/ai-analysis ── (FR-5.2: зөвлөмж, эцсийн шийдвэр биш)
router.get('/disputes/:id/ai-analysis', async (req, res, next) => {
  try {
    if (!ai.isConfigured()) {
      return res.status(503).json({ error: 'AI тохируулагдаагүй байна' });
    }

    const dispute = await prisma.dispute.findUnique({
      where: { id: req.params.id },
      include: {
        milestone: {
          include: {
            contract: {
              include: {
                job: { select: { title: true, description: true, skills: true } },
                tasks: { select: { title: true, status: true } },
                client: { select: { userId: true } },
                freelancer: { select: { userId: true } },
              },
            },
          },
        },
      },
    });
    if (!dispute) return res.status(404).json({ error: 'Олдсонгүй' });

    const { milestone } = dispute;
    const { contract } = milestone;
    const { userId: clientUserId } = contract.client;
    const { userId: freelancerUserId } = contract.freelancer;

    const conversation = await prisma.conversation.findFirst({
      where: {
        OR: [
          { userAId: clientUserId, userBId: freelancerUserId },
          { userAId: freelancerUserId, userBId: clientUserId },
        ],
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 200,
          select: { senderId: true, text: true, fileName: true, createdAt: true },
        },
      },
    });

    const chatTranscript = (conversation?.messages || [])
      .filter((m) => m.text || m.fileName)
      .map((m) => `${m.senderId === clientUserId ? 'Client' : 'Freelancer'}: ${m.text || `[файл: ${m.fileName}]`}`)
      .join('\n');

    const analysis = await ai.analyzeDispute({
      brief: contract.job,
      milestone: {
        title: milestone.title,
        amount: milestone.amount,
        status: milestone.status,
        deliveryNote: milestone.deliveryNote,
        deliveryLink: milestone.deliveryLink,
        revisionsUsed: milestone.revisionsUsed,
      },
      tasks: contract.tasks,
      chatTranscript: chatTranscript || '(чат түүх хоосон байна)',
      reason: dispute.reason,
    });

    res.json({ analysis });
  } catch (err) {
    if (err.upstream) return res.status(503).json({ error: 'AI түр боломжгүй байна' });
    next(err);
  }
});

// ── POST /admin/disputes/:id/resolve ──
// FREELANCER — milestone-ийн бүтэн дүн (комисс хассан) freelancer рүү.
// CLIENT — бүтэн дүн client-ийн балансад буцаана.
// SPLIT — тэнцүү хуваана (freelancer-ийн хагаст л комисс хамаарна).
router.post('/disputes/:id/resolve', async (req, res, next) => {
  try {
    const { data, error } = validate(disputeResolveSchema, req.body);
    if (error) return res.status(400).json({ error });

    const dispute = await prisma.dispute.findUnique({
      where: { id: req.params.id },
      include: { milestone: { include: { contract: true } } },
    });
    if (!dispute) return res.status(404).json({ error: 'Олдсонгүй' });
    if (dispute.status === 'RESOLVED') return res.status(409).json({ error: 'Аль хэдийн шийдэгдсэн байна' });

    const { milestone } = dispute;
    const { contract } = milestone;
    const [freelancerProfile, clientProfile] = await Promise.all([
      prisma.freelancerProfile.findUnique({ where: { id: contract.freelancerId } }),
      prisma.clientProfile.findUnique({ where: { id: contract.clientId } }),
    ]);

    if (data.resolution === 'FREELANCER') {
      await releaseMilestonePayment(milestone);
    } else if (data.resolution === 'CLIENT') {
      await prisma.$transaction([
        prisma.transaction.create({
          data: { userId: clientProfile.userId, kind: 'DEPOSIT', status: 'COMPLETED', amount: milestone.amount, provider: 'dispute_refund', milestoneId: milestone.id, completedAt: new Date() },
        }),
        prisma.milestone.update({ where: { id: milestone.id }, data: { status: 'APPROVED', approvedAt: new Date() } }),
      ]);
      await maybeCompleteContract(milestone.contractId, freelancerProfile.id);
    } else {
      const freelancerShare = Math.round(milestone.amount / 2);
      const clientShare = milestone.amount - freelancerShare;
      const commission = Math.round((freelancerShare * contract.commissionPct) / 100);
      await prisma.$transaction([
        prisma.transaction.create({
          data: {
            userId: freelancerProfile.userId, kind: 'ESCROW_RELEASE', status: 'COMPLETED',
            amount: freelancerShare - commission, provider: 'dispute_split', milestoneId: milestone.id,
            completedAt: new Date(), availableAt: new Date(Date.now() + PENDING_HOLD_DAYS * 24 * 60 * 60 * 1000),
          },
        }),
        prisma.transaction.create({
          data: { userId: clientProfile.userId, kind: 'DEPOSIT', status: 'COMPLETED', amount: clientShare, provider: 'dispute_split', milestoneId: milestone.id, completedAt: new Date() },
        }),
        prisma.milestone.update({ where: { id: milestone.id }, data: { status: 'APPROVED', approvedAt: new Date() } }),
      ]);
      await maybeCompleteContract(milestone.contractId, freelancerProfile.id);
    }

    const updated = await prisma.dispute.update({
      where: { id: dispute.id },
      data: { status: 'RESOLVED', resolution: data.resolution, resolvedAt: new Date() },
    });

    res.json(updated);
    createNotification({ userId: freelancerProfile.userId, type: 'system', text: `"${milestone.title}" маргаан шийдэгдлээ (${data.resolution})`, link: 'my-projects' });
    createNotification({ userId: clientProfile.userId, type: 'system', text: `"${milestone.title}" маргаан шийдэгдлээ (${data.resolution})`, link: 'my-projects' });
  } catch (err) {
    next(err);
  }
});

// ── Freelancer verification (FR-5.1) ──

// ── GET /admin/verifications ──
router.get('/verifications', async (req, res, next) => {
  try {
    const status = ['PENDING', 'VERIFIED', 'REJECTED'].includes(req.query.status) ? req.query.status : 'PENDING';
    const profiles = await prisma.freelancerProfile.findMany({
      where: { verificationStatus: status },
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
      orderBy: { verificationRequestedAt: 'desc' },
    });
    res.json({ profiles });
  } catch (err) {
    next(err);
  }
});

// ── POST /admin/verifications/:id/decide ── (:id = FreelancerProfile.id)
router.post('/verifications/:id/decide', async (req, res, next) => {
  try {
    const approve = req.body?.approve === true;
    const note = req.body?.note ? String(req.body.note).slice(0, 500) : null;

    const profile = await prisma.freelancerProfile.findUnique({ where: { id: req.params.id } });
    if (!profile) return res.status(404).json({ error: 'Олдсонгүй' });
    if (profile.verificationStatus !== 'PENDING') {
      return res.status(409).json({ error: 'Энэ хүсэлт аль хэдийн шийдэгдсэн байна' });
    }

    const updated = await prisma.freelancerProfile.update({
      where: { id: profile.id },
      data: {
        verificationStatus: approve ? 'VERIFIED' : 'REJECTED',
        verificationNote: note,
        verifiedAt: approve ? new Date() : null,
      },
    });

    res.json(updated);
    createNotification({
      userId: profile.userId,
      type: 'system',
      text: approve ? 'Таны профайл баталгаажлаа — Verified badge идэвхжлээ.' : `Таны баталгаажуулах хүсэлт татгалзагдлаа${note ? `: ${note}` : ''}`,
      link: 'settings',
    });
  } catch (err) {
    next(err);
  }
});

// ── Job moderation queue (FR-2.3) ──

// ── GET /admin/jobs/moderation ──
router.get('/jobs/moderation', async (req, res, next) => {
  try {
    const jobs = await prisma.job.findMany({
      where: { moderationStatus: 'PENDING' },
      include: { client: { include: { user: { select: { name: true } } } } },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ jobs });
  } catch (err) {
    next(err);
  }
});

// ── POST /admin/jobs/:id/moderate ── (body: { action: "APPROVE" | "REJECT" }) ──
router.post('/jobs/:id/moderate', async (req, res, next) => {
  try {
    const action = req.body?.action;
    if (!['APPROVE', 'REJECT'].includes(action)) return res.status(400).json({ error: 'action APPROVE эсвэл REJECT байх ёстой' });

    const job = await prisma.job.findUnique({ where: { id: req.params.id }, include: { client: true } });
    if (!job) return res.status(404).json({ error: 'Олдсонгүй' });

    const updated = await prisma.job.update({
      where: { id: req.params.id },
      data: { moderationStatus: action === 'APPROVE' ? 'APPROVED' : 'REJECTED' },
    });

    res.json(updated);
    createNotification({
      userId: job.client.userId,
      type: 'job',
      text: action === 'APPROVE'
        ? `Таны "${job.title}" зар шалгагдаж нийтлэгдлээ`
        : `Таны "${job.title}" зар татгалзагдлаа${job.moderationReason ? `: ${job.moderationReason}` : ''}`,
      link: 'my-projects',
    });
  } catch (err) {
    next(err);
  }
});

// ── Payout queue (FR-6.4) ──

// ── GET /admin/payouts ──
router.get('/payouts', async (req, res, next) => {
  try {
    const payouts = await prisma.transaction.findMany({
      where: { kind: 'WITHDRAWAL', status: 'PENDING' },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ payouts });
  } catch (err) {
    next(err);
  }
});

// ── POST /admin/payouts/:id/approve ──
router.post('/payouts/:id/approve', async (req, res, next) => {
  try {
    const tx = await prisma.transaction.findUnique({ where: { id: req.params.id } });
    if (!tx || tx.kind !== 'WITHDRAWAL' || tx.status !== 'PENDING') return res.status(404).json({ error: 'Олдсонгүй' });

    const updated = await prisma.transaction.update({
      where: { id: tx.id },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });
    res.json(updated);
    createNotification({ userId: tx.userId, type: 'payment', text: `Таны $${tx.amount.toLocaleString('en-US')} гаргалт баталгаажиж шилжүүлэгдлээ`, link: 'payments' });
  } catch (err) {
    next(err);
  }
});

// ── POST /admin/payouts/:id/reject ──
router.post('/payouts/:id/reject', async (req, res, next) => {
  try {
    const tx = await prisma.transaction.findUnique({ where: { id: req.params.id } });
    if (!tx || tx.kind !== 'WITHDRAWAL' || tx.status !== 'PENDING') return res.status(404).json({ error: 'Олдсонгүй' });

    const updated = await prisma.transaction.update({ where: { id: tx.id }, data: { status: 'FAILED' } });
    res.json(updated);
    createNotification({ userId: tx.userId, type: 'payment', text: `Таны $${tx.amount.toLocaleString('en-US')} гаргалтын хүсэлт татгалзагдаж, дүн балансад буцлаа`, link: 'payments' });
  } catch (err) {
    next(err);
  }
});

// ── GET /admin/reconciliation ── (NFR-1: Render free tier-д cron байхгүй тул on-demand)
router.get('/reconciliation', async (req, res, next) => {
  try {
    const report = await runReconciliation();
    res.json(report);
  } catch (err) {
    next(err);
  }
});

export default router;
