// Day 9 (PRD): Payment Module. Жинхэнэ QPay мерчант данс/key байхгүй тул
// демо горимоор ажиллана — /deposit нь QPay-ийн invoice/create-тэй адил
// PENDING invoice үүсгэж, /deposit/:id/confirm нь бодит банкны webhook
// ирэхэд хийх ёстой зүйлийг (COMPLETED болгож үлдэгдэлд нэмэх) хэрэглэгчийн
// "Би төлсөн" товчоор дуурайлгана. Жинхэнэ QPay key орж ирвэл confirm-ийг
// webhook route-оор сольж, deposit-ийг QPay-ийн invoice.create дуудлагаар
// сольхоос өөр өөрчлөлт хэрэггүй байхаар бүтэцлэв.
import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { createNotification } from './notification.routes.js';

const router = Router();

async function computeBalance(userId) {
  const [deposits, withdrawals] = await Promise.all([
    prisma.transaction.aggregate({
      where: { userId, kind: 'DEPOSIT', status: 'COMPLETED' },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { userId, kind: 'WITHDRAWAL', status: 'COMPLETED' },
      _sum: { amount: true },
    }),
  ]);
  return (deposits._sum.amount || 0) - (withdrawals._sum.amount || 0);
}

// ── GET /payments/balance ──
router.get('/balance', requireAuth, async (req, res, next) => {
  try {
    res.json({ balance: await computeBalance(req.user.id) });
  } catch (err) {
    next(err);
  }
});

// ── GET /payments/transactions ──
router.get('/transactions', requireAuth, async (req, res, next) => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ transactions });
  } catch (err) {
    next(err);
  }
});

// ── POST /payments/deposit ── (QPay invoice/create-ийн демо хувилбар)
router.post('/deposit', requireAuth, async (req, res, next) => {
  try {
    const amount = Number(req.body?.amount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 10_000_000) {
      return res.status(400).json({ error: 'Дүн буруу байна' });
    }

    const tx = await prisma.transaction.create({
      data: { userId: req.user.id, kind: 'DEPOSIT', amount: Math.round(amount), provider: 'qpay_demo' },
    });

    res.status(201).json({
      transaction: tx,
      // Демо QR/invoice утга — жинхэнэ QPay API-ийн invoice/create хариултын оронд
      qpayInvoiceNo: `DEMO-${tx.id.slice(0, 8).toUpperCase()}`,
      qrText: `qpay://demo-invoice/${tx.id}`,
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /payments/deposit/:id/confirm ── (webhook-ийн демо орлуулагч)
router.post('/deposit/:id/confirm', requireAuth, async (req, res, next) => {
  try {
    const tx = await prisma.transaction.findUnique({ where: { id: req.params.id } });
    if (!tx || tx.userId !== req.user.id) return res.status(404).json({ error: 'Олдсонгүй' });
    if (tx.status === 'COMPLETED') return res.json({ transaction: tx, balance: await computeBalance(req.user.id) });

    const updated = await prisma.transaction.update({
      where: { id: tx.id },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });

    res.json({ transaction: updated, balance: await computeBalance(req.user.id) });
    createNotification({
      userId: req.user.id,
      type: 'payment',
      text: `$${updated.amount.toLocaleString('en-US')} үлдэгдэлд амжилттай нэмэгдлээ`,
      link: 'payments',
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /payments/withdraw ── (шууд COMPLETED болно — жинхэнэ банкны
// шилжүүлэгт QPay/банкны API-ийн PENDING→confirm урсгал ижил хэрэгтэй болно)
router.post('/withdraw', requireAuth, async (req, res, next) => {
  try {
    const amount = Number(req.body?.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Дүн буруу байна' });
    }
    const balance = await computeBalance(req.user.id);
    if (amount > balance) {
      return res.status(400).json({ error: 'Үлдэгдэл хүрэлцэхгүй байна' });
    }

    const tx = await prisma.transaction.create({
      data: {
        userId: req.user.id,
        kind: 'WITHDRAWAL',
        status: 'COMPLETED',
        amount: Math.round(amount),
        provider: 'qpay_demo',
        completedAt: new Date(),
      },
    });

    res.status(201).json({ transaction: tx, balance: await computeBalance(req.user.id) });
    createNotification({
      userId: req.user.id,
      type: 'payment',
      text: `$${tx.amount.toLocaleString('en-US')} гаргалт амжилттай хийгдлээ`,
      link: 'payments',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
