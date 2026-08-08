import { apiJson, publicJson } from "./apiClient.js";

// { plans: [...], billingEnabled } — багцын тодорхойлолт одоо сервер талд
// (backend/src/lib/plans.js). Өмнө нь src/data/mock.js-д hardcode байсан тул
// комиссын хувь frontend болон backend дээр тус тусдаа бичигдэж, зөрөх
// боломжтой байв.
export const fetchPlans = () => publicJson("/plans");

// { planKey, planName, commissionPct, status, currentPeriodEnd, cancelAtPeriodEnd, manageable }
export const fetchMySubscription = () => apiJson("/subscription/me");

// { checkoutUrl } — Stripe рүү шилжүүлнэ.
export const startSubscriptionCheckout = (planKey, interval) =>
  apiJson("/subscription/checkout", { method: "POST", body: { planKey, interval } });

// { portalUrl } — карт солих/цуцлах нь Stripe-ийн өөрийнх нь порталд болно
// (картын мэдээлэл манай сервер рүү огт ирэхгүй).
export const openBillingPortal = () => apiJson("/subscription/portal", { method: "POST" });

// { provider, live, testMode, demoAllowed } — Payments хуудас ямар горимд
// ажиллаж байгааг хэрэглэгчид ил хэлэхэд хэрэглэнэ.
export const fetchPaymentStatus = () => publicJson("/payments/status");
