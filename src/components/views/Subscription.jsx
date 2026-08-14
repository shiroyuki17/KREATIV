import { useEffect, useState } from "react";
import {
  Check, Sparkles, AlertCircle, Loader2, ExternalLink, CreditCard, ShieldCheck,
} from "lucide-react";
import { useNav } from "../../nav.jsx";
import { useI18n } from "../../i18n.jsx";
import { longDate } from "../../lib/dates.js";
import {
  fetchPlans, fetchMySubscription, startSubscriptionCheckout, openBillingPortal,
} from "../../lib/billingApi.js";

// Захиалгын хуудас — одоогийн багц, эрх, төлбөрийн мөчлөг, багц солих.
//
// Төлбөрийн ямар ч баталгаажуулалт ЭНД болохгүй: Checkout эхлүүлээд Stripe
// рүү явуулах л үүрэгтэй. Захиалга идэвхжсэнийг зөвхөн webhook бичдэг
// (stripe-webhook.routes.js) — Stripe-аас буцаж ирсэн нь төлбөрийн баталгаа биш.

const STATUS_META = {
  ACTIVE: { labelKey: "sb.stActive", cls: "border-mint/30 bg-mint/10 text-mint" },
  PENDING: { labelKey: "sb.stPending", cls: "border-amber-400/30 bg-amber-400/10 text-amber-300" },
  PAST_DUE: { labelKey: "sb.stPastDue", cls: "border-amber-400/30 bg-amber-400/10 text-amber-300" },
  CANCELED: { labelKey: "sb.stCanceled", cls: "border-white/15 bg-white/[0.05] text-white/50" },
  NONE: { labelKey: "sb.stNone", cls: "border-white/15 bg-white/[0.05] text-white/50" },
};

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

function priceFor(plan, yearly, t) {
  if (plan.monthlyUsd === null) return { text: t("sb.custom"), sub: t("sb.talkToSales") };
  if (plan.monthlyUsd === 0) return { text: t("sb.free"), sub: t("sb.noCard") };
  const monthly = yearly && plan.yearlyUsd != null
    ? Math.round(plan.yearlyUsd / 12)
    : plan.monthlyUsd;
  return {
    text: `$${monthly}`,
    sub: yearly && plan.yearlyUsd != null
      ? t("sb.billedYearly", { amount: plan.yearlyUsd })
      : t("sb.billedMonthly"),
  };
}

// Багцын нэр/тайлбар/эрх нь backend-ийн эрх мэдэлд үлдэнэ (мөнгөтэй
// холбоотой) — Pricing.jsx-тэй ижил зарчмаар зөвхөн харагдах бичвэрийг
// орчуулж, толь бичигт байхгүй бол англи эх рүү эргэж унана.
function localized(t, key, fallback) {
  const val = t(key);
  return val === key ? fallback : val;
}

function planFeatures(t, plan) {
  const keyed = [];
  for (let i = 1; i <= plan.features.length; i++) {
    const k = `plan.${plan.key}.feat${i}`;
    const val = t(k);
    if (val === k) return plan.features;
    keyed.push(val);
  }
  return keyed;
}

export default function Subscription() {
  const { nav } = useNav();
  const { t, locale } = useI18n();
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
  const periodEnd = sub?.currentPeriodEnd ? longDate(sub.currentPeriodEnd, locale) : null;
  const savings = yearlySavings(plans);

  return (
    <div className="mx-auto max-w-4xl px-6 pb-16 pt-8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-soft">
        {t("sb.eyebrow")}
      </p>
      <h1 className="mt-2 font-display text-[clamp(1.6rem,3vw,2.2rem)] font-bold tracking-tight">
        {t("sb.title")}
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
                {t(status.labelKey)}
              </span>
            </div>
            <p className="mt-1.5 text-[13px] text-white/50">
              {t("sb.commission", { pct: sub?.commissionPct })}
            </p>

            {/* Хугацааны мэдээллийг зөвхөн байгаа үед нь харуулна. */}
            {periodEnd && sub?.status === "ACTIVE" && (
              <p className="mt-3 text-[12.5px] text-white/45">
                {sub.cancelAtPeriodEnd
                  ? t("sb.cancelsOn", { date: periodEnd })
                  : t("sb.renewsOn", { date: periodEnd })}
              </p>
            )}
            {sub?.status === "PAST_DUE" && (
              <p className="mt-3 text-[12.5px] text-amber-300/90">
                {t("sb.pastDueHint")}
              </p>
            )}
            {sub?.status === "PENDING" && (
              <p className="mt-3 text-[12.5px] text-white/45">
                {t("sb.pendingHint")}
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
              {t("sb.manage")}
              <ExternalLink className="h-3.5 w-3.5 opacity-60" />
            </button>
          )}
        </div>
      </div>

      {!billingEnabled && (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3.5 text-[12.5px] text-white/55">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <span>
            {t("sb.notConfigured")}
          </span>
        </div>
      )}

      {/* Мөчлөгийн сэлгүүр */}
      <div className="mt-8 flex items-center justify-center">
        <div className="inline-flex items-center gap-1 rounded-full glass p-1.5">
          {[["monthly", t("sb.monthly")], ["yearly", t("sb.yearly")]].map(([mode, label]) => {
            const active = (mode === "yearly") === yearly;
            return (
              <button
                key={mode}
                onClick={() => setYearly(mode === "yearly")}
                className={active
                  ? "rounded-full bg-brand px-5 py-2 text-[12.5px] font-semibold text-ink glow-brand"
                  : "rounded-full px-5 py-2 text-[12.5px] font-medium text-white/50 hover:text-white"}
              >
                {label}
                {mode === "yearly" && savings && (
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
          const price = priceFor(plan, yearly, t);
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
                    {t("sb.current")}
                  </span>
                )}
              </div>
              <p className="mt-1 text-[12.5px] text-white/45">
                {localized(t, `plan.${plan.key}.tagline`, plan.tagline)}
              </p>

              <div className="mt-5">
                <p className="font-display text-3xl font-bold">
                  {price.text}
                  {plan.monthlyUsd > 0 && (
                    <span className="text-[13px] font-medium text-white/40">{t("sb.perMonth")}</span>
                  )}
                </p>
                <p className="mt-1 text-[11px] text-white/35">{price.sub}</p>
              </div>

              <ul className="mt-6 flex-1 space-y-2.5">
                {planFeatures(t, plan).map((f) => (
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
                    {t("sb.yourPlan")}
                  </div>
                ) : (
                  <button
                    onClick={() => choosePlan(plan)}
                    disabled={!canBuy && plan.key !== "enterprise"}
                    title={
                      !canBuy && plan.key === "pro" && !billingEnabled
                        ? t("sb.notConfiguredShort")
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
                        <Loader2 className="h-4 w-4 animate-spin" /> {t("sb.redirecting")}
                      </>
                    ) : (
                      <>
                        {plan.popular && <Sparkles className="h-4 w-4" />}
                        {localized(t, `plan.${plan.key}.cta`, plan.cta)}
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
        {t("sb.footnote")}
      </p>
    </div>
  );
}
