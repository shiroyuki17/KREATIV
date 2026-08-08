// Захиалга (Pricing хуудасны Starter/Pro/Enterprise).
//
// Төлбөрийн БАТАЛГААЖУУЛАЛТ энд байхгүй — Checkout эхлүүлээд Stripe рүү
// илгээх л үүрэгтэй. Захиалга идэвхжсэн/цуцлагдсаныг зөвхөн webhook
// (stripe-webhook.routes.js) бичдэг: success_url руу буцаж ирсэн нь
// төлбөрийн баталгаа биш, хэрэглэгч тэр хаягийг гараар бичиж болно.
import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import * as stripe from '../lib/payments/stripe.js';
import { PLANS, publicPlans, effectivePlan, stripePriceIdFor } from '../lib/plans.js';
import { logError } from '../lib/logger.js';

const router = Router();

// ── GET /plans ── (нийтэд — Pricing хуудас үүнийг рендэрлэнэ)
router.get('/plans', (req, res) => {
  res.json({ plans: publicPlans(), billingEnabled: stripe.isConfigured() });
});

// ── GET /subscription/me ──
router.get('/subscription/me', requireAuth, async (req, res, next) => {
  try {
    const subscription = await prisma.subscription.findUnique({ where: { userId: req.user.id } });
    const plan = effectivePlan(subscription);
    res.json({
      planKey: plan.key,
      planName: plan.name,
      commissionPct: plan.commissionPct,
      status: subscription?.status || 'NONE',
      currentPeriodEnd: subscription?.currentPeriodEnd || null,
      cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd || false,
      // Stripe-ийн portal нээх боломжтой эсэх (карт солих, цуцлах).
      manageable: !!subscription?.stripeCustomerId && stripe.isConfigured(),
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /subscription/checkout ── body: { planKey, interval }
router.post('/subscription/checkout', requireAuth, async (req, res, next) => {
  try {
    if (!stripe.isConfigured()) {
      return res.status(503).json({ error: 'Захиалгын төлбөр одоогоор идэвхгүй байна.' });
    }

    const planKey = req.body?.planKey;
    const interval = req.body?.interval === 'yearly' ? 'yearly' : 'monthly';
    const plan = PLANS[planKey];

    if (!plan || !plan.purchasable) {
      return res.status(400).json({ error: 'Энэ багцыг онлайнаар худалдан авах боломжгүй' });
    }

    const priceId = stripePriceIdFor(planKey, interval);
    if (!priceId) {
      // Багц нь "худалдаж авах боломжтой" гэж тодорхойлогдсон ч Stripe Price
      // ID тохируулаагүй байна — тохиргооны алдаа, хэрэглэгчийн буруу биш.
      logError(new Error('Stripe Price ID тохируулаагүй'), { planKey, interval });
      return res.status(503).json({ error: 'Багцын үнэ тохируулагдаагүй байна. Админтай холбогдоно уу.' });
    }

    const existing = await prisma.subscription.findUnique({ where: { userId: req.user.id } });
    if (existing?.status === 'ACTIVE' && existing.planKey === planKey) {
      return res.status(409).json({ error: 'Та энэ багцад аль хэдийн бүртгэлтэй байна' });
    }

    const session = await stripe.createSubscriptionSession({
      priceId,
      userId: req.user.id,
      email: req.user.email,
      stripeCustomerId: existing?.stripeCustomerId || null,
    });

    // Checkout эхэлснийг тэмдэглэнэ — webhook ирэх хүртэл UI "хүлээгдэж
    // байна" гэж харуулж чадна. Эрх нь ACTIVE болтол нээгдэхгүй.
    await prisma.subscription.upsert({
      where: { userId: req.user.id },
      update: { status: existing?.status === 'ACTIVE' ? existing.status : 'PENDING' },
      create: { userId: req.user.id, planKey: 'starter', status: 'PENDING' },
    });

    res.json({ checkoutUrl: session.url });
  } catch (err) {
    next(err);
  }
});

// ── POST /subscription/portal ── (карт солих / цуцлах — Stripe-ийн порталд)
router.post('/subscription/portal', requireAuth, async (req, res, next) => {
  try {
    const subscription = await prisma.subscription.findUnique({ where: { userId: req.user.id } });
    if (!subscription?.stripeCustomerId || !stripe.isConfigured()) {
      return res.status(400).json({ error: 'Удирдах захиалга олдсонгүй' });
    }
    const session = await stripe.createBillingPortalSession({
      stripeCustomerId: subscription.stripeCustomerId,
    });
    res.json({ portalUrl: session.url });
  } catch (err) {
    next(err);
  }
});

export default router;
