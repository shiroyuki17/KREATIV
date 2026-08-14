import { useEffect, useState } from "react";
import { Check, Feather, Rocket, Loader2, AlertCircle } from "lucide-react";
import StarBorder from "../fx/StarBorder.jsx";
import Magnet from "../fx/Magnet.jsx";
import BlurText from "../fx/BlurText.jsx";
import { useNav } from "../../nav.jsx";
import { useT } from "../../i18n.jsx";
import { hasSession } from "../../lib/authApi.js";
import { fetchPlans, startSubscriptionCheckout } from "../../lib/billingApi.js";

const PLAN_ICON = { Starter: Feather, Pro: Rocket };

// Багцууд одоо GET /plans-аас ирнэ (backend/src/lib/plans.js). Өмнө нь
// src/data/mock.js-д hardcode байсан бөгөөд товч нь onClick ч үгүй байв —
// өөрөөр хэлбэл "Pro $29/сар" гэдэг нь ердөө зурсан текст байлаа.

function Price({ plan, yearly, t }) {
  if (plan.monthlyUsd === 0)
    return <p className="font-display text-4xl font-bold">{t("prc.free")}</p>;
  // Жилийн үнийг серверийн yearlyUsd-аас гаргана — 0.8-аар үржүүлж
  // таамаглахгүй (Stripe дээрх бодит Price-тай зөрвөл хэрэглэгч
  // өөр дүн харснаа өөр дүнгээр төлнө).
  const price = yearly && plan.yearlyUsd != null
    ? Math.round(plan.yearlyUsd / 12)
    : plan.monthlyUsd;
  return (
    <p className="font-display text-4xl font-bold">
      ${price}
      <span className="text-[13px] font-medium text-white/40">{t("prc.perMonth")}</span>
    </p>
  );
}

// Багцын үнэ/эрх нь backend-ийн эрх мэдэлд үлдэнэ (мөнгөтэй холбоотой) —
// зөвхөн ХАРАГДАХ бичвэрийг орчуулна. Толь бичигт байхгүй багц ирвэл
// t() түлхүүрээ буцаадаг тул тэр тохиолдолд backend-ийн англи бичвэр рүү
// эргэж унана; ингэснээр шинэ багц нэмэхэд хуудас эвдрэхгүй.
function localized(t, key, fallback) {
  const val = t(key);
  return val === key ? fallback : val;
}

function planFeatures(t, plan) {
  const keyed = [];
  for (let i = 1; i <= plan.features.length; i++) {
    const k = `plan.${plan.key}.feat${i}`;
    const val = t(k);
    if (val === k) return plan.features; // дутуу орчуулгатай бол бүхэлд нь англиар
    keyed.push(val);
  }
  return keyed;
}

function PlanCard({ plan, yearly, onSelect, busy, disabledReason, t }) {
  const Icon = PLAN_ICON[plan.name] || Feather;
  const disabled = busy || (!plan.purchasable && plan.key === "pro");
  return (
    <div className="flex h-full flex-col p-7">
      <div className="flex items-start justify-between">
        <span
          className={
            plan.popular
              ? "flex h-11 w-11 items-center justify-center rounded-xl border border-brand/40 bg-brand/10 text-brand-soft"
              : "flex h-11 w-11 items-center justify-center rounded-xl border border-white/12 bg-white/[0.03] text-white/60"
          }
        >
          <Icon className="h-5 w-5" />
        </span>
        {plan.popular && (
          <span className="rounded-full bg-brand/15 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-brand-soft">
            {t("prc.mostPopular")}
          </span>
        )}
      </div>
      <p className="mt-4 font-display text-lg font-semibold">{plan.name}</p>
      <p className="mt-1 text-[12.5px] text-white/45">{localized(t, `plan.${plan.key}.tagline`, plan.tagline)}</p>
      <div className="mt-6">
        <Price plan={plan} yearly={yearly} t={t} />
      </div>
      <ul className="mt-7 space-y-3">
        {planFeatures(t, plan).map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-[13px] text-white/70">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-mint" />
            {f}
          </li>
        ))}
      </ul>
      <div className="mt-auto pt-8">
        <Magnet strength={0.2} className="w-full">
          <button
            onClick={() => onSelect(plan)}
            disabled={disabled}
            title={disabled && disabledReason ? disabledReason : undefined}
            className={
              (plan.popular
                ? "w-full rounded-xl bg-brand py-3 text-[13.5px] font-semibold glow-brand transition-shadow"
                : "glass w-full rounded-xl py-3 text-[13.5px] font-semibold text-white/85 transition-colors hover:border-white/25")
              + (disabled ? " cursor-not-allowed opacity-50" : "")
            }
          >
            {busy ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> {t("prc.redirecting")}
              </span>
            ) : (
              localized(t, `plan.${plan.key}.cta`, plan.cta)
            )}
          </button>
        </Magnet>
        {disabled && disabledReason && (
          <p className="mt-2 text-center text-[10.5px] leading-snug text-white/40">{disabledReason}</p>
        )}
      </div>
    </div>
  );
}

export default function Pricing() {
  const { nav } = useNav();
  const t = useT();
  const [yearly, setYearly] = useState(true);
  const [plans, setPlans] = useState([]);
  const [billingEnabled, setBillingEnabled] = useState(false);
  const [busyKey, setBusyKey] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchPlans()
      .then((res) => {
        if (cancelled) return;
        setPlans(res.plans);
        setBillingEnabled(res.billingEnabled);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  async function selectPlan(plan) {
    setError("");

    // Үнэгүй багц авах гэж төлбөрийн урсгал руу оруулах шаардлагагүй.
    if (plan.key === "starter") { nav("auth"); return; }

    // Нэвтрээгүй бол нэвтрэх хуудас руу.
    //
    // ⚠️ Энд stashRedirect("home") дуудаж БОЛОХГҮЙ. Auth.jsx нь нэвтэрсний
    // дараа stash-ыг хэрэглэгчийн жинхэнэ дашбоардаас ИЛҮҮД үздэг тул
    // "home"-ыг хадгалбал нэвтэрсэн хүн бүр дашбоард дээрээ очихын оронд
    // landing page руу буцдаг байв. Дээр нь sessionStorage-д наалдаж
    // үлддэг тул хэдэн ч удаа нэвтэрсэн дахин давтагдана.
    if (!hasSession()) {
      nav("auth");
      return;
    }

    setBusyKey(plan.key);
    try {
      const { checkoutUrl } = await startSubscriptionCheckout(plan.key, yearly ? "yearly" : "monthly");
      // Stripe-ийн байршуулсан хуудас руу шилжинэ — картын мэдээлэл манай
      // домэйнд огт орохгүй.
      window.location.href = checkoutUrl;
    } catch (err) {
      setError(err.message);
      setBusyKey(null);
    }
  }

  const disabledReason = billingEnabled ? "" : t("prc.billingOff");

  // Хөнгөлөлтийг серверийн үнээс тооцоолно — гараар бичсэн хувь нь Stripe
  // дээрх бодит үнэ солигдоход чимээгүй худал болно.
  const pro = plans.find((p) => p.key === "pro");
  const savings = pro?.monthlyUsd && pro?.yearlyUsd
    ? Math.max(0, Math.round((1 - pro.yearlyUsd / (pro.monthlyUsd * 12)) * 100)) || null
    : null;

  return (
    <section id="pricing" className="relative py-12 md:py-24">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-24 h-[360px] w-[680px] -translate-x-1/2 rounded-full bg-brand/10 blur-[130px]"
      />
      <div className="relative mx-auto max-w-6xl px-6">
        <div className="text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-soft">
            {t("prc.eyebrow")}
          </p>
          <h2 className="mt-3 font-display text-[clamp(1.9rem,3.6vw,2.8rem)] font-bold text-brand text-glow tracking-tight">
            <BlurText text={t("prc.title")} />
          </h2>

          <div className="mt-8 inline-flex items-center gap-1 rounded-full glass p-1.5">
            {[
              { key: "monthly", label: t("prc.monthly") },
              { key: "yearly", label: t("prc.yearly") },
            ].map((mode) => {
              const active = (mode.key === "yearly") === yearly;
              return (
                <button
                  key={mode.key}
                  onClick={() => setYearly(mode.key === "yearly")}
                  className={
                    active
                      ? "rounded-full bg-brand px-5 py-2 text-[12.5px] font-semibold glow-brand"
                      : "rounded-full px-5 py-2 text-[12.5px] font-medium text-white/50 hover:text-white"
                  }
                >
                  {mode.label}
                  {mode.key === "yearly" && savings && (
                    <span className="ml-1.5 text-[10px] font-bold text-mint">
                      −{savings}%
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="mx-auto mt-8 flex max-w-md items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-[12.5px] text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Хоёр багц — картуудыг дэлгэцийн бүтэн өргөнд сунгахгүй, голлуулна.
            Өмнө нь гурван баганатай байсныг Enterprise хассны дараа шууд
            үлдээвэл хоосон багана үүснэ. */}
        <div className="mx-auto mt-12 grid max-w-3xl items-stretch gap-5 md:grid-cols-2">
          {plans.map((plan) => {
            const card = (
              <PlanCard
                plan={plan}
                yearly={yearly}
                onSelect={selectPlan}
                busy={busyKey === plan.key}
                disabledReason={disabledReason}
                t={t}
              />
            );
            return plan.popular ? (
              <StarBorder key={plan.key}>{card}</StarBorder>
            ) : (
              <div key={plan.key} className="glass rounded-2xl">{card}</div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
