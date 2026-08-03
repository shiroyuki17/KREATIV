import { useState } from "react";
import { Check } from "lucide-react";
import StarBorder from "../fx/StarBorder.jsx";
import Magnet from "../fx/Magnet.jsx";
import BlurText from "../fx/BlurText.jsx";
import { PLANS } from "../../data/mock.js";

function Price({ plan, yearly }) {
  if (plan.monthly === null)
    return <p className="font-display text-4xl font-bold">Custom</p>;
  if (plan.monthly === 0)
    return <p className="font-display text-4xl font-bold">Free</p>;
  const price = yearly ? Math.round(plan.monthly * 0.8) : plan.monthly;
  return (
    <p className="font-display text-4xl font-bold">
      ${price}
      <span className="text-[13px] font-medium text-white/40">/mo</span>
    </p>
  );
}

function PlanCard({ plan, yearly }) {
  return (
    <div className="flex h-full flex-col p-7">
      <div className="flex items-center justify-between">
        <p className="font-display text-lg font-semibold">{plan.name}</p>
        {plan.popular && (
          <span className="rounded-full bg-brand/15 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-brand-soft">
            Most popular
          </span>
        )}
      </div>
      <p className="mt-1 text-[12.5px] text-white/45">{plan.tagline}</p>
      <div className="mt-6">
        <Price plan={plan} yearly={yearly} />
      </div>
      <ul className="mt-7 space-y-3">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-[13px] text-white/70">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-mint" />
            {f}
          </li>
        ))}
      </ul>
      <div className="mt-auto pt-8">
        <Magnet strength={0.2} className="w-full">
          <button
            className={
              plan.popular
                ? "w-full rounded-xl bg-gradient-to-r from-brand to-brand-soft py-3 text-[13.5px] font-semibold glow-brand transition-shadow hover:shadow-[0_0_44px_rgba(0,211,149,0.6)]"
                : "glass w-full rounded-xl py-3 text-[13.5px] font-semibold text-white/85 transition-colors hover:border-white/25"
            }
          >
            {plan.cta}
          </button>
        </Magnet>
      </div>
    </div>
  );
}

export default function Pricing() {
  const [yearly, setYearly] = useState(true);

  return (
    <section id="pricing" className="relative py-12 md:py-24">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-24 h-[360px] w-[680px] -translate-x-1/2 rounded-full bg-brand/10 blur-[130px]"
      />
      <div className="relative mx-auto max-w-6xl px-6">
        <div className="text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-soft">
            — Pricing
          </p>
          <h2 className="mt-3 font-display text-[clamp(1.9rem,3.6vw,2.8rem)] font-bold text-brand text-glow tracking-tight">
            <BlurText text="Lower fees. Higher leverage." />
          </h2>

          <div className="mt-8 inline-flex items-center gap-1 rounded-full glass p-1.5">
            {["Monthly", "Yearly"].map((mode) => {
              const active = (mode === "Yearly") === yearly;
              return (
                <button
                  key={mode}
                  onClick={() => setYearly(mode === "Yearly")}
                  className={
                    active
                      ? "rounded-full bg-brand px-5 py-2 text-[12.5px] font-semibold glow-brand"
                      : "rounded-full px-5 py-2 text-[12.5px] font-medium text-white/50 hover:text-white"
                  }
                >
                  {mode}
                  {mode === "Yearly" && (
                    <span className="ml-1.5 text-[10px] font-bold text-mint">
                      −20%
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-12 grid items-stretch gap-5 md:grid-cols-3">
          {PLANS.map((plan) =>
            plan.popular ? (
              <StarBorder key={plan.name}>
                <PlanCard plan={plan} yearly={yearly} />
              </StarBorder>
            ) : (
              <div key={plan.name} className="glass rounded-2xl">
                <PlanCard plan={plan} yearly={yearly} />
              </div>
            )
          )}
        </div>
      </div>
    </section>
  );
}
