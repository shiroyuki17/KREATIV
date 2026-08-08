import { useEffect, useState } from "react";
import {
  Check, Sparkles, AlertCircle, Loader2, ExternalLink, CreditCard, ShieldCheck,
} from "lucide-react";
import { useNav } from "../../nav.jsx";
import {
  fetchPlans, fetchMySubscription, startSubscriptionCheckout, openBillingPortal,
} from "../../lib/billingApi.js";

// Захиалгын хуудас — одоогийн багц, эрх, төлбөрийн мөчлөг, багц солих.
//
// Төлбөрийн ямар ч баталгаажуулалт ЭНД болохгүй: Checkout эхлүүлээд Stripe
// рүү явуулах л үүрэгтэй. Захиалга идэвхжсэнийг зөвхөн webhook бичдэг
// (stripe-webhook.routes.js) — Stripe-аас буцаж ирсэн нь төлбөрийн баталгаа биш.

const STATUS_META = {
  ACTIVE: { label: "Active", cls: "border-mint/30 bg-mint/10 text-mint" },
  PENDING: { label: "Awaiting payment", cls: "border-amber-400/30 bg-amber-400/10 text-amber-300" },
  PAST_DUE: { label: "Payment failed", cls: "border-amber-400/30 bg-amber-400/10 text-amber-300" },
  CANCELED: { label: "Canceled", cls: "border-white/15 bg-white/[0.05] text-white/50" },
  NONE: { label: "Free plan", cls: "border-white/15 bg-white/[0.05] text-white/50" },
};

function formatDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

// Жилийн хөнгөлөлтийг ТООЦООЛНО, гараар бичихгүй. Өмнө нь энд "−17%",
// Pricing.jsx дээр "−20%" гэж зөрүүтэй бичээстэй байсан бөгөөд хоёул
// Stripe дээрх бодит үнэтэй таарахгүй байв.
function yearlySavings(plans) {
  const pro = plans.find((p) => p.key === "pro");
  if (!pro?.monthlyUsd || !pro?.yearlyUsd) return null;
  const full = pro.monthlyUsd * 12;
  const pct = Math.round((1 - pro.yearlyUsd / full) * 100);
  return pct > 0 ? pct : null;
}

function priceFor(plan, yearly) {
  if (plan.monthlyUsd === null) return { text: "Custom", sub: "Talk to sales" };
  if (plan.monthlyUsd === 0) return { text: "Free", sub: "No card required" };
  const monthly = yearly && plan.yearlyUsd != null
    ? Math.round(plan.yearlyUsd / 12)
    : plan.monthlyUsd;
  return {
    text: `$${monthly}`,
    sub: yearly && plan.yearlyUsd != null ? `$${plan.yearlyUsd} billed yearly` : "billed monthly",
  };
}

export default function Subscription() {
  const { nav } = useNav();
  const [plans, setPlans] = useState([]);
  const [billingEnabled, setBillingEnabled] = useState(false);
  const [sub, setSub] = useState(null);
  const [yearly, setYearly] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState(null);
  const [portalBusy, setPortalBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchPlans(), fetchMySubscription()])
      .then(([p, s]) => {
        if (cancelled) return;
        setPlans(p.plans);
        setBillingEnabled(p.billingEnabled);
        setSub(s);
      })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  async function choosePlan(plan) {
    setError("");
    if (plan.key === "enterprise") { nav("contact"); return; }
    if (plan.key === "starter") return; // үнэгүй багц — Checkout шаардлагагүй

    setBusyKey(plan.key);
    try {
      const { checkoutUrl } = await startSubscriptionCheckout(plan.key, yearly ? "yearly" : "monthly");
      window.location.href = checkoutUrl;
    } catch (err) {
      setError(err.message);
      setBusyKey(null);
    }
  }

  async function manage() {
    setError("");
    setPortalBusy(true);
    try {
      const { portalUrl } = await openBillingPortal();
      window.location.href = portalUrl;
    } catch (err) {
      setError(err.message);
      setPortalBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="animate-pulse-soft h-28 rounded-2xl bg-white/[0.06]" />
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse-soft h-64 rounded-2xl bg-white/[0.06]" />
          ))}
        </div>
      </div>
    );
  }

  const status = STATUS_META[sub?.status] || STATUS_META.NONE;
  const periodEnd = formatDate(sub?.currentPeriodEnd);
  const savings = yearlySavings(plans);

  return (
    <div className="mx-auto max-w-4xl px-6 pb-16 pt-8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-soft">
        — Billing
      </p>
      <h1 className="mt-2 font-display text-[clamp(1.6rem,3vw,2.2rem)] font-bold tracking-tight">
        Your plan
      </h1>

      {error && (
        <div className="mt-5 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-[13px] text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Одоогийн байдал */}
      <div className="glass mt-6 rounded-2xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <p className="font-display text-xl font-bold">{sub?.planName || "Starter"}</p>
              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${status.cls}`}>
                {status.label}
              </span>
            </div>
            <p className="mt-1.5 text-[13px] text-white/50">
              {sub?.commissionPct}% escrow commission on every milestone
            </p>

            {/* Хугацааны мэдээллийг зөвхөн байгаа үед нь харуулна. */}
            {periodEnd && sub?.status === "ACTIVE" && (
              <p className="mt-3 text-[12.5px] text-white/45">
                {sub.cancelAtPeriodEnd
                  ? `Cancels on ${periodEnd} — you keep Pro access until then.`
                  : `Renews on ${periodEnd}.`}
              </p>
            )}
            {sub?.status === "PAST_DUE" && (
              <p className="mt-3 text-[12.5px] text-amber-300/90">
                We couldn't charge your card. Stripe will retry — update your payment
                method to avoid losing access.
              </p>
            )}
            {sub?.status === "PENDING" && (
              <p className="mt-3 text-[12.5px] text-white/45">
                Checkout started but payment isn't confirmed yet. This updates
                automatically once Stripe confirms.
              </p>
            )}
          </div>

          {sub?.manageable && (
            <button
              onClick={manage}
              disabled={portalBusy}
              className="inline-flex items-center gap-2 rounded-xl border border-white/12 px-4 py-2.5 text-[13px] font-semibold text-white/80 transition-colors hover:border-brand/40 hover:text-white disabled:opacity-50"
            >
              {portalBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
              Manage billing
              <ExternalLink className="h-3.5 w-3.5 opacity-60" />
            </button>
          )}
        </div>
      </div>

      {!billingEnabled && (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3.5 text-[12.5px] text-white/55">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <span>
            Online billing isn't configured on this deployment yet, so paid plans
            can't be purchased. Everything else works normally on the free plan.
          </span>
        </div>
      )}

      {/* Мөчлөгийн сэлгүүр */}
      <div className="mt-8 flex items-center justify-center">
        <div className="inline-flex items-center gap-1 rounded-full glass p-1.5">
          {["Monthly", "Yearly"].map((mode) => {
            const active = (mode === "Yearly") === yearly;
            return (
              <button
                key={mode}
                onClick={() => setYearly(mode === "Yearly")}
                className={active
                  ? "rounded-full bg-brand px-5 py-2 text-[12.5px] font-semibold text-ink glow-brand"
                  : "rounded-full px-5 py-2 text-[12.5px] font-medium text-white/50 hover:text-white"}
              >
                {mode}
                {mode === "Yearly" && savings && (
                  <span className="ml-1.5 text-[10px] font-bold text-mint">−{savings}%</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Багцууд */}
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {plans.map((plan) => {
          const current = (sub?.planKey || "starter") === plan.key;
          const price = priceFor(plan, yearly);
          const canBuy = plan.purchasable && !current;

          return (
            <div
              key={plan.key}
              className={`glass flex flex-col rounded-2xl p-6 ${current ? "border-brand/50" : ""}`}
            >
              <div className="flex items-center justify-between">
                <p className="font-display text-[17px] font-bold">{plan.name}</p>
                {current && (
                  <span className="rounded-full bg-brand/15 px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-wider text-brand-soft">
                    Current
                  </span>
                )}
              </div>
              <p className="mt-1 text-[12.5px] text-white/45">{plan.tagline}</p>

              <div className="mt-5">
                <p className="font-display text-3xl font-bold">
                  {price.text}
                  {plan.monthlyUsd > 0 && (
                    <span className="text-[13px] font-medium text-white/40">/mo</span>
                  )}
                </p>
                <p className="mt-1 text-[11px] text-white/35">{price.sub}</p>
              </div>

              <ul className="mt-6 flex-1 space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[12.5px] text-white/65">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-soft" />
                    {f}
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                {current ? (
                  <div className="flex items-center justify-center gap-2 rounded-xl border border-white/10 py-3 text-[13px] font-semibold text-white/40">
                    <ShieldCheck className="h-4 w-4" />
                    Your plan
                  </div>
                ) : (
                  <button
                    onClick={() => choosePlan(plan)}
                    disabled={!canBuy && plan.key !== "enterprise"}
                    title={
                      !canBuy && plan.key === "pro" && !billingEnabled
                        ? "Online billing is not configured yet."
                        : undefined
                    }
                    className={`inline-flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[13px] font-semibold transition-all ${
                      plan.popular
                        ? "bg-brand text-ink glow-brand"
                        : "border border-white/12 text-white/80 hover:border-brand/40 hover:text-white"
                    } ${!canBuy && plan.key !== "enterprise" ? "cursor-not-allowed opacity-40" : ""}`}
                  >
                    {busyKey === plan.key ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Redirecting…
                      </>
                    ) : (
                      <>
                        {plan.popular && <Sparkles className="h-4 w-4" />}
                        {plan.cta}
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-8 text-center text-[11.5px] leading-relaxed text-white/35">
        Payments are handled by Stripe — card details never touch KREATIV's servers.
        Cancel any time from Manage billing.
      </p>
    </div>
  );
}
