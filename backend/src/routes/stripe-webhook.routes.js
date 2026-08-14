// Stripe webhook — deposit болон захиалгын аль алины ЦОРЫН ГАНЦ үнэний эх
// сурвалж.
//
// Хоёр зүйлийг онцгойлон анхаарсан:
//
//  1. **Raw body.** Stripe гарын үсгийг ЯГ ирсэн байт дээр тооцдог тул энэ
//     route нь app.js-д express.json()-оос ӨМНӨ, express.raw()-тайгаар
//     холбогдоно. JSON болгож задалчихсан биетийг дахин stringify хийвэл
//     гарын үсэг таарахгүй.
//
//  2. **Давхардал (idempotency).** Stripe нэг эвентийг олон удаа илгээж
//     болно (сүлжээний алдаа, 2xx хоцорсон г.м). Тиймээс бүх боловсруулалт
//     "аль хэдийн COMPLETED/ACTIVE бол алгас" гэсэн шалгалттай — эс тэгвээс
//     нэг deposit хоёр удаа тоологдож үлдэгдэл давхарлана.
import { Router } from 'express';
import express from 'express';
import prisma from '../lib/prisma.js';
import * as stripe from '../lib/payments/stripe.js';
import { logError, logEvent } from '../lib/logger.js';
// Захиалгыг DB рүү бичих логик нь subscription.routes.js-ийн тулгах
// (reconcile) зам ХОЁУЛАА ижил байх ёстой тул хуваалцсан модульд байна.
import { upsertSubscription } from '../lib/subscriptionSync.js';
// Цэнэглэлт бичих логик нь payment.routes.js-ийн тулгах замтай ижил байх
// ёстой тул хуваалцсан модульд байна.
import { completeDeposit } from '../lib/depositSync.js';

const router = Router();

async function handleCheckoutCompleted(session) {
  if (session.mode === 'payment') {
    const transactionId = session.client_reference_id || session.metadata?.transactionId;
    if (!transactionId) return;

    const tx = await prisma.transaction.findUnique({ where: { id: transactionId } });
    if (!tx) return;
    // Давхар илгээгдсэн эвент — юу ч хийхгүй.
    if (tx.status === 'COMPLETED') return;
    // Stripe өөрөө "төлөгдсөн" гэж хэлээгүй бол хүлээнэ (жишээ нь
    // хойшлуулсан төлбөрийн арга).
    if (session.payment_status !== 'paid') return;

    await completeDeposit(tx);
    logEvent('stripe.deposit.completed', { transactionId: tx.id, amount: tx.amount });
    return;
  }

  if (session.mode === 'subscription') {
    const userId = session.client_reference_id || session.metadata?.userId;
    if (!userId || !session.subscription) return;

    const subscription = await stripe.retrieveSubscription(session.subscription);
    await upsertSubscription(userId, subscription, session.customer);
    logEvent('stripe.subscription.started', { userId, subscriptionId: subscription.id });
  }
}

async function handleSubscriptionEvent(subscription) {
  // subscription_data.metadata-д тавьсан userId (stripe.js-ийг үзнэ үү).
  // Байхгүй бол аль хэдийн хадгалсан stripeSubscriptionId-аар хайна —
  // жишээ нь Stripe Dashboard-аас гараар үүсгэсэн захиалга.
  let userId = subscription.metadata?.userId;
  if (!userId) {
    const existing = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscription.id },
    });
    userId = existing?.userId;
  }
  if (!userId) {
    logError(new Error('Stripe subscription-ийг хэрэглэгчтэй холбож чадсангүй'), {
      subscriptionId: subscription.id,
    });
    return;
  }
  await upsertSubscription(userId, subscription, subscription.customer);
}

// ── POST /webhooks/stripe ──
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.constructEvent(req.body, signature);
  } catch (err) {
    // Гарын үсэг таараагүй = энэ хүсэлт Stripe-аас ирээгүй. 400 буцаана
    // (Stripe дахин оролдохгүй) бөгөөд ЯМАР Ч өөрчлөлт хийхгүй.
    logError(err, { route: 'webhooks/stripe', stage: 'signature' });
    return res.status(400).json({ error: `Webhook signature шалгалт амжилтгүй: ${err.message}` });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await handleSubscriptionEvent(event.data.object);
        break;

      case 'invoice.payment_failed':
        logEvent('stripe.invoice.failed', { customer: event.data.object.customer });
        break;

      default:
        // Бусад эвентийг зориуд үл тоомсорлоно — Stripe олон төрлийн эвент
        // илгээдэг тул бүгдийг барих шаардлагагүй.
        break;
    }
  } catch (err) {
    // 500 буцаавал Stripe дахин илгээнэ — түр зуурын алдаанд яг үүнийг
    // хүсэж байгаа (DB унасан г.м).
    logError(err, { route: 'webhooks/stripe', eventType: event.type });
    return res.status(500).json({ error: 'Webhook боловсруулахад алдаа гарлаа' });
  }

  res.json({ received: true });
});

export default router;
