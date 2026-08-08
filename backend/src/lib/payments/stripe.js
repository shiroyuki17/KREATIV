// Stripe адаптер — escrow-ийн deposit болон Pro захиалгын Checkout.
//
// Хамрах хүрээг тодорхой хэлье: энд хийж байгаа зүйл нь хэрэглэгчийн
// ХЭТЭВЧИЙГ цэнэглэх (deposit) болон захиалгын төлбөр авах хоёр. Freelancer
// рүү мөнгө ГАРГАХ тал (withdraw) нь өмнөх шигээ админ баталгаажуулдаг
// гар ажиллагаа хэвээр — Stripe Connect-ийн payout/KYC урсгал ЭНД
// ХЭРЭГЖЭЭГҮЙ. Connect нэмэх бол энэ файлд тусдаа функц нэмнэ.
import Stripe from 'stripe';
import { config } from '../../config/env.js';

let client = null;

export function isConfigured() {
  // Тестэд Stripe-ыг ҮРГЭЛЖ идэвхгүй гэж үзнэ. `.env.test` нь бүх түлхүүрийг
  // тодорхойлдоггүй тул `dotenv/config` дутуугий нь `.env`-ээс нөхдөг —
  // өөрөөр хэлбэл хөгжүүлэгчийн бодит sk_test_… түлхүүр тестэд алдардаг.
  // Энэ нь зөвхөн subscription биш, deposit-ийн урсгалыг ч гуравдагч
  // үйлчилгээ рүү залгах тул тестийг тусгаарлах ганц цэг энд байх нь зөв.
  if (config.NODE_ENV === 'test') return false;
  return !!config.STRIPE_SECRET_KEY;
}

function stripe() {
  if (!client) {
    if (!config.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY тохируулаагүй байна');
    client = new Stripe(config.STRIPE_SECRET_KEY);
  }
  return client;
}

/** Test mode эсэхийг түлхүүрээс нь шууд мэдэж болно — UI дээр анхааруулга харуулна. */
export function isTestMode() {
  return !!config.STRIPE_SECRET_KEY?.startsWith('sk_test_');
}

// Stripe мөнгийг ХАМГИЙН ЖИЖИГ НЭГЖЭЭР (цент) авдаг. Манай Transaction.amount
// нь бүхэл тоо (доллар) тул хөрвүүлэлтийг нэг л газар хийж, бөөрөнхийлөлтийн
// алдаа тарахаас сэргийлнэ.
const toMinorUnits = (usd) => Math.round(usd * 100);

/**
 * Хэтэвч цэнэглэх Checkout Session.
 * @returns {Promise<{ sessionId: string, url: string }>}
 */
export async function createDepositSession({ amountUsd, userId, transactionId, email }) {
  const session = await stripe().checkout.sessions.create({
    mode: 'payment',
    customer_email: email || undefined,
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: toMinorUnits(amountUsd),
          product_data: {
            name: 'KREATIV escrow deposit',
            description: 'Хэтэвчийн үлдэгдэл цэнэглэх',
          },
        },
        quantity: 1,
      },
    ],
    // Webhook ирэхэд аль Transaction болохыг эндээс уншина. client_reference_id
    // нь Stripe-ийн "энэ бол таны талын ID" гэсэн стандарт талбар.
    client_reference_id: transactionId,
    metadata: { userId, transactionId, kind: 'deposit' },
    success_url: `${config.FRONTEND_URL}/#/payments?deposit=success`,
    cancel_url: `${config.FRONTEND_URL}/#/payments?deposit=cancelled`,
  });
  return { sessionId: session.id, url: session.url };
}

/**
 * Захиалгын Checkout Session.
 *
 * Хэрэглэгч аль хэдийн Stripe Customer-тэй бол түүнийг дахин ашиглана —
 * эс тэгвээс төлбөр бүрд шинэ Customer үүсч, Stripe Dashboard дээр нэг
 * хүн олон мөрөөр харагдана.
 */
export async function createSubscriptionSession({ priceId, userId, email, stripeCustomerId }) {
  const session = await stripe().checkout.sessions.create({
    mode: 'subscription',
    ...(stripeCustomerId ? { customer: stripeCustomerId } : { customer_email: email || undefined }),
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: userId,
    metadata: { userId, kind: 'subscription' },
    // subscription_data.metadata нь ҮҮССЭН Subscription объект дээр үлддэг —
    // Checkout Session-ийхээс ялгаатай. customer.subscription.* webhook-ууд
    // нь Session-ыг харахгүй тул хэрэглэгчийг олохын тулд энэ хэрэгтэй.
    subscription_data: { metadata: { userId } },
    success_url: `${config.FRONTEND_URL}/#/settings?plan=success`,
    cancel_url: `${config.FRONTEND_URL}/#/?plan=cancelled`,
  });
  return { sessionId: session.id, url: session.url };
}

/**
 * Захиалгаа удирдах Stripe-ийн өөрийнх нь портал (карт солих, цуцлах,
 * нэхэмжлэх татах). Үүнийг өөрсдөө хийхээс хамаагүй найдвартай —
 * картын мэдээлэл манай сервер рүү огт ирэхгүй.
 */
export async function createBillingPortalSession({ stripeCustomerId }) {
  const session = await stripe().billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${config.FRONTEND_URL}/#/settings`,
  });
  return { url: session.url };
}

/**
 * Webhook-ийн гарын үсгийг шалгаж, эвентийг задална.
 *
 * ⚠️ rawBody нь ЯГ ирсэн байт байх ёстой. express.json() задалж, дараа нь
 * дахин JSON.stringify хийсэн бол түлхүүрийн дараалал/зай өөрчлөгдөж
 * гарын үсэг таарахгүй — тиймээс webhook route нь express.raw() ашиглана.
 */
export function constructEvent(rawBody, signature) {
  if (!config.STRIPE_WEBHOOK_SECRET) {
    throw new Error('STRIPE_WEBHOOK_SECRET тохируулаагүй тул webhook-ийг баталгаажуулах боломжгүй');
  }
  return stripe().webhooks.constructEvent(rawBody, signature, config.STRIPE_WEBHOOK_SECRET);
}

/** Webhook дээр ирсэн subscription-ийг бүрэн эхээр нь татах. */
export function retrieveSubscription(subscriptionId) {
  return stripe().subscriptions.retrieve(subscriptionId);
}

export function retrieveSession(sessionId) {
  return stripe().checkout.sessions.retrieve(sessionId);
}
