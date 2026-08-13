// Stripe-ийн захиалгыг манай DB рүү буулгах ГАНЦ эх сурвалж.
//
// Хоёр зам үүнийг дуудна:
//   1. stripe-webhook.routes.js — Stripe өөрөө түлхэж мэдэгдэхэд.
//   2. subscription.routes.js — хэрэглэгч хуудсаа нээхэд PENDING хэвээр
//      байвал Stripe-аас ШУУД асууж тулгана.
//
// Хоёр дахь зам нь заавал хэрэгтэй: webhook тохируулаагүй, эсвэл түр
// уначихсан бол хэрэглэгч мөнгөө төлчихөөд "Awaiting payment" дээр
// мөнхөд гацдаг байв. Энэ нь төлбөрийг ХУУРАМЧААР баталгаажуулж
// байгаа хэрэг биш — Stripe-аас "энэ үнэхээр төлөгдсөн үү?" гэж асууж,
// түүний хариултыг л бичнэ.
import prisma from './prisma.js';
import * as stripe from './payments/stripe.js';
import { planKeyFromStripePrice } from './plans.js';
import { logError, logEvent } from './logger.js';

/** Stripe-ийн subscription статусыг манай enum руу буулгана. */
export function mapSubscriptionStatus(stripeStatus) {
  switch (stripeStatus) {
    case 'active':
    case 'trialing':
      return 'ACTIVE';
    case 'past_due':
    case 'unpaid':
      return 'PAST_DUE';
    case 'canceled':
    case 'incomplete_expired':
      return 'CANCELED';
    default:
      return 'PENDING';
  }
}

/** Stripe-ийн subscription объектыг манай Subscription мөр рүү бичнэ. */
export async function upsertSubscription(userId, subscription, customerId) {
  const priceId = subscription.items?.data?.[0]?.price?.id;
  const planKey = planKeyFromStripePrice(priceId);
  // Танихгүй price ирвэл багцыг таамаглахгүй — Starter хэвээр үлдээж,
  // мөрөө үлдээнэ. (Dashboard дээр шинэ Price үүсгээд env-д нэмээгүй үед.)
  if (!planKey) {
    logError(new Error('Танихгүй Stripe price ID'), { priceId, userId });
  }

  const periodEnd = subscription.items?.data?.[0]?.current_period_end
    ?? subscription.current_period_end;

  const data = {
    planKey: planKey || 'starter',
    status: mapSubscriptionStatus(subscription.status),
    stripeCustomerId: typeof customerId === 'string' ? customerId : subscription.customer,
    stripeSubscriptionId: subscription.id,
    currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
    cancelAtPeriodEnd: !!subscription.cancel_at_period_end,
  };

  await prisma.subscription.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  });
  return data;
}

/**
 * PENDING дээр гацсан захиалгыг Stripe-аас асууж тулгана.
 *
 * Аюулгүй байдал: энд хэрэглэгчийн өгсөн ямар ч утга ашиглахгүй — зөвхөн
 * бид өөрсдөө checkout эхлүүлэхдээ хадгалсан session ID-г Stripe-аас
 * татаж, түүний өөрийнх нь хэлснийг бичнэ. Хэрэглэгч "төлсөн" гэж
 * хэлсэн эсэх нь ямар ч нөлөөгүй.
 *
 * @returns Шинэчлэгдсэн бол шинэ subscription мөр, үгүй бол null.
 */
export async function reconcilePendingSubscription(subscription, email) {
  if (!subscription || subscription.status !== 'PENDING') return null;
  if (!stripe.isConfigured()) return null;

  const userId = subscription.userId;
  const reload = () => prisma.subscription.findUnique({ where: { userId } });

  try {
    // ── 1. Хадгалсан session ID байвал түүгээр ──
    if (subscription.stripeCheckoutSessionId) {
      const session = await stripe.retrieveSession(subscription.stripeCheckoutSessionId);

      if (session?.subscription) {
        const stripeSub = await stripe.retrieveSubscription(
          typeof session.subscription === 'string' ? session.subscription : session.subscription.id
        );
        await upsertSubscription(userId, stripeSub, session.customer);
        logEvent('stripe.subscription.reconciled', { userId, subscriptionId: stripeSub.id, status: stripeSub.status });
        return reload();
      }

      // Checkout нээгдээд дуусаагүй (хэрэглэгч цонхоо хаасан) — Stripe
      // session-ыг "expired" болгодог. Ийм үед PENDING-ийг цэвэрлэнэ:
      // эс тэгвээс төлбөр хийгээгүй хүн "Awaiting payment" гэсэн бичгийг
      // мөнхөд харна.
      if (session?.status === 'expired') {
        await clearStalePending(userId);
        return reload();
      }
      // status === 'open' — хэрэглэгч яг одоо төлж байж болно, хүлээнэ.
      return null;
    }

    // ── 2. Session ID байхгүй (энэ талбар нэмэгдэхээс өмнөх хуучин мөр) ──
    // Имэйлээр нь Stripe-аас хайж үзнэ.
    const found = await stripe.findLatestSubscriptionByEmail(email);
    if (found) {
      await upsertSubscription(userId, found.subscription, found.customerId);
      logEvent('stripe.subscription.reconciled', {
        userId,
        subscriptionId: found.subscription.id,
        status: found.subscription.status,
        via: 'email',
      });
      return reload();
    }

    // Stripe талд ямар ч захиалга алга — төлбөр хэзээ ч дуусаагүй гэсэн үг.
    await clearStalePending(userId);
    return reload();
  } catch (err) {
    // Stripe унасан — хуудас унагаах шалтгаан биш, PENDING хэвээр
    // харуулаад дараагийн ачаалалтад дахин оролдоно.
    logError(err, { where: 'reconcilePendingSubscription', userId });
    return null;
  }
}

/** Дуусаагүй checkout-ийн үлдэгдэл PENDING-ийг цэвэрлэнэ (үнэгүй багц руу). */
async function clearStalePending(userId) {
  await prisma.subscription.update({
    where: { userId },
    data: { status: 'NONE', stripeCheckoutSessionId: null },
  });
  logEvent('stripe.subscription.stale_pending_cleared', { userId });
}
