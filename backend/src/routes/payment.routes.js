// Day 9 (PRD): Payment Module.
//
// Гурван горим: Stripe, QPay, эсвэл демо — lib/payments/index.js сонгоно.
// Демо горим нь ЯМАР Ч МӨНГӨГҮЙГЭЭР үлдэгдэл үүсгэдэг тул production-д
// зөвхөн ALLOW_DEMO_PAYMENTS=true үед л ажиллана (доорх requireUsablePayments).
import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { createNotification } from './notification.routes.js';
import { computeBalance, computeEscrowHeld, computePendingBalance, MIN_WITHDRAWAL } from '../lib/wallet.js';
import { logEvent, logError } from '../lib/logger.js';
import * as qpay from '../lib/qpay.js';
import * as stripe from '../lib/payments/stripe.js';
import { activeProvider, demoAllowed, paymentStatus } from '../lib/payments/index.js';
import { reconcilePendingDeposits } from '../lib/depositSync.js';
import { config } from '../config/env.js';

const router = Router();

// Демо горим production дээр асаалттай үлдэхээс сэргийлнэ. Мөнгө хөдөлгөх
// (deposit/confirm) route-уудад л хэрэглэнэ — үлдэгдэл харах, түүх татах
// зэрэг нь ямар ч горимд ажиллах ёстой.
function requireUsablePayments(req, res, next) {
  if (activeProvider() !== 'demo' || demoAllowed()) return next();
  return res.status(503).json({
    error: 'Төлбөрийн систем тохируулагдаагүй байна. Админтай холбогдоно уу.',
  });
}

// ── GET /payments/status ── (UI-д ямар горимд ажиллаж байгааг ил хэлнэ)
router.get('/status', (req, res) => {
  res.json(paymentStatus());
});

// ── GET /payments/balance ──
router.get('/balance', requireAuth, async (req, res, next) => {
  try {
    // Webhook ирээгүй/тохируулаагүй бол төлсөн цэнэглэлт PENDING дээр
    // мөнхөд гацаж, үлдэгдэл 0 хэвээр үлддэг байв. Үлдэгдлээ харах бүрд
    // Stripe-аас ШУУД асууж тулгана (клиентийн үгэнд итгэхгүй).
    await reconcilePendingDeposits(req.user.id);

    const [balance, escrowHeld, pending] = await Promise.all([
      computeBalance(req.user.id),
      computeEscrowHeld(req.user.id),
      computePendingBalance(req.user.id),
    ]);
    res.json({ balance, escrowHeld, pending, minWithdrawal: MIN_WITHDRAWAL });
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

// ── POST /payments/deposit ── (QPay холбогдсон бол бодит invoice/create,
// эс бөгөөс демо горим)
router.post('/deposit', requireAuth, requireUsablePayments, async (req, res, next) => {
  try {
    const amount = Number(req.body?.amount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 10_000_000) {
      return res.status(400).json({ error: 'Дүн буруу байна' });
    }
    const roundedAmount = Math.round(amount);
    const provider = activeProvider();

    // ── Stripe: Checkout Session үүсгээд хэрэглэгчийг Stripe рүү илгээнэ.
    // Төлөгдсөнийг ЗӨВХӨН webhook баталгаажуулна — success_url руу буцаж
    // ирсэн нь төлбөр хийгдсэний баталгаа БИШ (хэрэглэгч тэр хаягийг
    // гараар бичиж болно).
    if (provider === 'stripe') {
      const tx = await prisma.transaction.create({
        data: { userId: req.user.id, kind: 'DEPOSIT', amount: roundedAmount, provider: 'stripe' },
      });
      try {
        const session = await stripe.createDepositSession({
          amountUsd: roundedAmount,
          userId: req.user.id,
          transactionId: tx.id,
          email: req.user.email,
        });
        await prisma.transaction.update({
          where: { id: tx.id },
          data: { stripeSessionId: session.sessionId },
        });
        return res.status(201).json({ transaction: tx, checkoutUrl: session.url });
      } catch (stripeErr) {
        await prisma.transaction.delete({ where: { id: tx.id } });
        throw stripeErr;
      }
    }

    if (provider === 'qpay') {
      const tx = await prisma.transaction.create({
        data: { userId: req.user.id, kind: 'DEPOSIT', amount: roundedAmount, provider: 'qpay' },
      });
      try {
        const invoice = await qpay.createInvoice({
          amount: roundedAmount,
          senderInvoiceNo: tx.id,
          description: `KREATIV escrow deposit — ${req.user.id}`,
        });
        await prisma.transaction.update({ where: { id: tx.id }, data: { qpayInvoiceId: invoice.invoiceId } });
        return res.status(201).json({ transaction: tx, qrText: invoice.qrText, qrImage: invoice.qrImage, urls: invoice.urls });
      } catch (qpayErr) {
        // Invoice амжилтгүй бол хагас дутуу PENDING transaction үлдэхгүй
        await prisma.transaction.delete({ where: { id: tx.id } });
        throw qpayErr;
      }
    }

    const tx = await prisma.transaction.create({
      data: { userId: req.user.id, kind: 'DEPOSIT', amount: roundedAmount, provider: 'qpay_demo' },
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

async function completeDeposit(tx) {
  const updated = await prisma.transaction.update({
    where: { id: tx.id },
    data: { status: 'COMPLETED', completedAt: new Date() },
  });
  createNotification({
    userId: tx.userId,
    type: 'payment',
    text: `$${updated.amount.toLocaleString('en-US')} үлдэгдэлд амжилттай нэмэгдлээ`,
    link: 'payments',
  });
  return updated;
}

// Демо горимд хэрэглэгч "төлсөн" гэж мэдэгдэхийг хэдэн секундын дараа
// хүлээн зөвшөөрнө — жинхэнэ банкны баталгаажуулалтыг дуурайна.
//
// ⚠️ Энэ нь ямар ч мөнгөгүйгээр үлдэгдэл үүсгэдэг тул production-д АЮУЛТАЙ.
// requireUsablePayments нь production дээр демог бүрмөсөн хаадаг (зөвхөн
// ALLOW_DEMO_PAYMENTS=true үед онгойно) — өөрөөр хэлбэл энэ мөр зөвхөн
// dev/test/санаатай демо орчинд л хүрнэ.
// Integration тест хиймэл хугацаа хүлээж чадахгүй тул NODE_ENV=test-д шууд шийднэ
const DEMO_AUTO_COMPLETE_MS = config.NODE_ENV === 'test' ? 0 : 4000;

// ── POST /payments/deposit/:id/confirm ── (frontend-ээс автоматаар poll
// хийгддэг — "settled: false" нь "хараахан ирээгүй", алдаа биш)
router.post('/deposit/:id/confirm', requireAuth, requireUsablePayments, async (req, res, next) => {
  try {
    const tx = await prisma.transaction.findUnique({ where: { id: req.params.id } });
    if (!tx || tx.userId !== req.user.id) return res.status(404).json({ error: 'Олдсонгүй' });
    if (tx.status === 'COMPLETED') {
      return res.json({ transaction: tx, balance: await computeBalance(req.user.id), settled: true });
    }

    // Stripe: төлбөрийг ЗӨВХӨН webhook эцэслэнэ. Энэ route нь Stripe-ийн
    // хувьд ердөө "төлөгдсөн үү?" гэсэн асуулт — өөрөө хэзээ ч COMPLETED
    // болгохгүй. Тэгэхгүй бол хэрэглэгч энэ endpoint-ыг гараар дуудаад
    // үнэгүй үлдэгдэл авах боломжтой болно.
    if (tx.provider === 'stripe') {
      return res.json({ transaction: tx, settled: false, awaitingWebhook: true });
    }

    if (tx.provider === 'qpay' && tx.qpayInvoiceId) {
      const { paid } = await qpay.checkPayment(tx.qpayInvoiceId);
      if (!paid) return res.json({ transaction: tx, settled: false });
    } else {
      const elapsed = Date.now() - new Date(tx.createdAt).getTime();
      if (elapsed < DEMO_AUTO_COMPLETE_MS) return res.json({ transaction: tx, settled: false });
    }

    const updated = await completeDeposit(tx);
    res.json({ transaction: updated, balance: await computeBalance(req.user.id), settled: true });
  } catch (err) {
    next(err);
  }
});

// ── POST /payments/qpay/callback ── (QPay webhook — auth шаардахгүй,
// public. Payload-д итгэхгүй, QPay-ийн зөвлөсний дагуу checkPayment-ээр
// дахин баталгаажуулна.)
router.post('/qpay/callback', async (req, res, next) => {
  try {
    const invoiceId = req.query.invoice_id || req.body?.invoice_id || req.body?.object_id;
    if (!invoiceId) return res.status(400).json({ error: 'invoice_id байхгүй' });

    const tx = await prisma.transaction.findUnique({ where: { qpayInvoiceId: invoiceId } });
    if (!tx) return res.status(404).json({ error: 'Тохирох transaction олдсонгүй' });
    if (tx.status === 'COMPLETED') return res.json({ ok: true });

    const { paid } = await qpay.checkPayment(invoiceId);
    if (paid) await completeDeposit(tx);
    res.json({ ok: true });
  } catch (err) {
    logError(err, { route: 'qpay/callback' });
    next(err);
  }
});

// ── POST /payments/withdraw ── (FR-6.4: доод хэмжээ + PENDING болж админ
// баталгаажуулах хүртэл хүлээнэ — жинхэнэ банкны шилжүүлэгт ойролцоо урсгал.
// Хүсэлт гаргамагц дүн шууд "захиалагдана" (computeBalance-ийн available-аас
// хасагдана), давхар татахаас сэргийлнэ).
router.post('/withdraw', requireAuth, async (req, res, next) => {
  try {
    const amount = Number(req.body?.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Дүн буруу байна' });
    }
    if (amount < MIN_WITHDRAWAL) {
      return res.status(400).json({ error: `Доод татах дүн $${MIN_WITHDRAWAL}` });
    }
    const balance = await computeBalance(req.user.id);
    if (amount > balance) {
      return res.status(400).json({ error: 'Үлдэгдэл хүрэлцэхгүй байна' });
    }

    const tx = await prisma.transaction.create({
      data: {
        userId: req.user.id,
        kind: 'WITHDRAWAL',
        status: 'PENDING',
        amount: Math.round(amount),
        provider: 'qpay_demo',
      },
    });

    res.status(201).json({ transaction: tx, balance: await computeBalance(req.user.id) });
    logEvent('withdrawal_requested', { userId: req.user.id, amount: tx.amount });
    createNotification({
      userId: req.user.id,
      type: 'payment',
      text: `$${tx.amount.toLocaleString('en-US')} гаргалтын хүсэлт админд илгээгдлээ`,
      link: 'payments',
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /payments/export ── (FR-6.5: татварын тайланд зориулсан CSV)
router.get('/export', requireAuth, async (req, res, next) => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: { userId: req.user.id, status: 'COMPLETED' },
      orderBy: { createdAt: 'asc' },
    });
    const rows = [
      ['Огноо', 'Төрөл', 'Дүн', 'Milestone ID', 'Provider'].join(','),
      ...transactions.map((t) => [
        t.completedAt?.toISOString() || t.createdAt.toISOString(),
        t.kind,
        t.amount,
        t.milestoneId || '',
        t.provider,
      ].join(',')),
    ];
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="kreativ-transactions.csv"');
    // UTF-8 BOM. Excel/WPS нь charset толгойг үл тоомсорлож, файлыг
    // системийн legacy кодчлолоор уншдаг тул кирилл толгой мөр ("Огноо",
    // "Төрөл", "Дүн") эвдэрч, хятад ханз мэт харагддаг байв. BOM нь
    // тэдгээрт UTF-8 гэдгийг хоёрдмол утгагүй хэлнэ.
    res.send('﻿' + rows.join('\r\n'));
  } catch (err) {
    next(err);
  }
});

export default router;
