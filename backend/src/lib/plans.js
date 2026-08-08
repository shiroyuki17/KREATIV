// Багцын ГАНЦ эх сурвалж.
//
// Өмнө нь багцууд зөвхөн frontend-ийн src/data/mock.js дотор байсан бөгөөд
// Pricing.jsx-ийн товч нь onClick ч үгүй байв — өөрөөр хэлбэл "Pro $29/сар"
// гэдэг нь ердөө зурсан текст байлаа. Одоо үнэ, эрх, комиссын хувь бүгд
// эндээс гарна: frontend GET /plans-аар татаж харуулна, backend эрх
// шалгахдаа мөн эндээс уншина. Хоёр тал зөрөх боломжгүй.
//
// ⚠️ `stripePriceId` нь env-ээс ирнэ (STRIPE_PRICE_PRO_MONTHLY / _YEARLY).
// Stripe Dashboard дээр Product + Price үүсгэхэд гарах `price_...` ID-г
// тавина. Product ID (`prod_...`) шаардлагагүй — Checkout нь Price-аар
// ажилладаг.
import { config } from '../config/env.js';

// Комиссын хувь нь МӨНГӨТЭЙ шууд холбоотой тул энд төвлөрүүлэв — escrow
// суутгал тооцоолох код (wallet.js) үүнийг л уншина.
export const PLANS = {
  starter: {
    key: 'starter',
    name: 'Starter',
    tagline: 'For first briefs',
    monthlyUsd: 0,
    yearlyUsd: 0,
    commissionPct: 10,
    maxActiveProposals: 5,
    features: [
      '10% escrow commission',
      '5 active proposals',
      'Community support',
      'Standard profile',
    ],
    cta: 'Start free',
    purchasable: false,
  },
  pro: {
    key: 'pro',
    name: 'Pro',
    tagline: 'For serious freelancers & teams',
    monthlyUsd: 29,
    // Жилээр 2 сарын хөнгөлөлт — Pricing.jsx-ийн "Yearly" сэлгүүртэй таарна.
    yearlyUsd: 290,
    commissionPct: 5,
    maxActiveProposals: null, // хязгааргүй
    features: [
      '5% escrow commission',
      'Unlimited proposals',
      'AI matchmaking engine',
      'Priority support',
      'Verified badge',
    ],
    cta: 'Go Pro',
    popular: true,
    purchasable: true,
  },
  enterprise: {
    key: 'enterprise',
    name: 'Enterprise',
    tagline: 'For scaled hiring',
    // Үнэ нь хэлэлцээрээр — self-serve худалдан авалт байхгүй тул
    // Checkout-д огт ордоггүй, "Talk to sales" руу чиглүүлнэ.
    monthlyUsd: null,
    yearlyUsd: null,
    commissionPct: 2,
    maxActiveProposals: null,
    features: [
      '2% escrow commission',
      'Dedicated success manager',
      'Custom contracts & SSO',
      'API access',
      'White-glove onboarding',
    ],
    cta: 'Talk to sales',
    purchasable: false,
  },
};

export const DEFAULT_PLAN_KEY = 'starter';

/** Тухайн багц + мөчлөгт харгалзах Stripe Price ID (тохируулаагүй бол null). */
export function stripePriceIdFor(planKey, interval) {
  if (planKey !== 'pro') return null;
  return interval === 'yearly'
    ? config.STRIPE_PRICE_PRO_YEARLY || null
    : config.STRIPE_PRICE_PRO_MONTHLY || null;
}

/** Stripe-ийн price ID-аас багц руу буцаах — webhook боловсруулахад хэрэгтэй. */
export function planKeyFromStripePrice(priceId) {
  if (!priceId) return null;
  if (priceId === config.STRIPE_PRICE_PRO_MONTHLY || priceId === config.STRIPE_PRICE_PRO_YEARLY) {
    return 'pro';
  }
  return null;
}

/** Нийтэд харуулах жагсаалт — Pricing хуудас үүнийг шууд рендэрлэнэ. */
export function publicPlans() {
  return Object.values(PLANS).map((p) => ({
    key: p.key,
    name: p.name,
    tagline: p.tagline,
    monthlyUsd: p.monthlyUsd,
    yearlyUsd: p.yearlyUsd,
    commissionPct: p.commissionPct,
    features: p.features,
    cta: p.cta,
    popular: !!p.popular,
    // Тухайн багцыг ОДОО худалдаж авах боломжтой эсэх. Stripe тохируулаагүй
    // бол `purchasable: true` гэж худал амлахгүй — UI нь товчийг идэвхгүй
    // болгож, шалтгааныг нь хэлнэ.
    purchasable: p.purchasable && !!stripePriceIdFor(p.key, 'monthly'),
  }));
}

/**
 * Хэрэглэгчийн ИДЭВХТЭЙ багцыг тодорхойлно.
 *
 * PAST_DUE-г идэвхтэйд тооцно: Stripe төлбөрийг хэд хэдэн удаа дахин
 * оролддог тул нэг амжилтгүй оролдлогоор эрхийг нь тасалбал төлж байгаа
 * хэрэглэгчийг шийтгэсэн болно. Stripe эцэст нь CANCELED болгоно.
 */
export function effectivePlan(subscription) {
  if (!subscription) return PLANS[DEFAULT_PLAN_KEY];
  const live = subscription.status === 'ACTIVE' || subscription.status === 'PAST_DUE';
  if (!live) return PLANS[DEFAULT_PLAN_KEY];
  return PLANS[subscription.planKey] || PLANS[DEFAULT_PLAN_KEY];
}
