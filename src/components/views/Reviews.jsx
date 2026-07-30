import { useState } from "react";
import { Star, Quote, ArrowRight } from "lucide-react";
import BlurText from "../fx/BlurText.jsx";
import SpotlightCard from "../fx/SpotlightCard.jsx";
import CountUp from "../fx/CountUp.jsx";
import { TESTIMONIALS } from "../../data/appMock.js";
import { useNav } from "../../nav.jsx";

const STATS = [
  { value: 4.9, decimals: 1, label: "Average rating" },
  { value: 48000, suffix: "+", label: "Projects delivered" },
  { value: 98, suffix: "%", label: "Would hire again" },
  { value: 99.2, decimals: 1, suffix: "%", label: "Disputes resolved fairly" },
];

const FILTERS = ["All", "Clients", "Freelancers"];

export default function Reviews() {
  const { nav } = useNav();
  const [filter, setFilter] = useState("All");
  const featured = TESTIMONIALS[0];

  const list = TESTIMONIALS.filter((t) =>
    filter === "All" ? true : filter === "Clients" ? /Client/.test(t.role) : !/Client/.test(t.role)
  );

  return (
    <div className="mx-auto max-w-6xl px-6 pb-24 pt-36">
      <div className="text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-soft">— Success stories</p>
        <h1 className="mx-auto mt-4 max-w-2xl font-display text-[clamp(2.2rem,4.5vw,3.4rem)] font-bold text-brand text-glow leading-[1.05] tracking-tight">
          <BlurText text="Great work, fairly paid." />
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-white/55">
          Thousands of clients and freelancers ship with confidence on KREATIV. Here's what they say.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.label} className="glass rounded-2xl p-5 text-center">
            <p className="font-display text-3xl font-bold text-brand">
              <CountUp to={s.value} suffix={s.suffix || ""} decimals={s.decimals || 0} />
            </p>
            <p className="mt-1.5 text-[10.5px] font-medium uppercase tracking-wider text-white/40">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Featured */}
      <div className="glass mt-6 overflow-hidden rounded-3xl">
        <div className="relative p-8 md:p-12">
          <Quote className="absolute right-8 top-8 h-16 w-16 text-brand/10" />
          <div className="flex gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />)}
          </div>
          <p className="mt-5 max-w-3xl font-display text-[clamp(1.3rem,2.4vw,1.9rem)] font-semibold leading-snug">
            “{featured.text}”
          </p>
          <div className="mt-7 flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-brand/50 to-neon/40 font-display text-[14px] font-bold ring-1 ring-white/15">
              {featured.initials}
            </span>
            <div>
              <p className="text-[15px] font-semibold">{featured.name}</p>
              <p className="text-[12.5px] text-white/45">{featured.role} · {featured.metric}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter + grid */}
      <div className="mt-10 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={filter === f
              ? "rounded-full bg-brand px-4 py-2 text-[12px] font-semibold text-ink glow-brand"
              : "rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-[12px] font-medium text-white/55 transition-colors hover:border-brand/40 hover:text-white"}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {list.map((t) => (
          <SpotlightCard key={t.name}>
            <div className="flex h-full flex-col p-6">
              <div className="flex items-center justify-between">
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-3.5 w-3.5 ${i < Math.round(t.rating) ? "fill-amber-400 text-amber-400" : "text-white/15"}`} />
                  ))}
                </div>
                <span className="rounded-full border border-brand/25 bg-brand/8 px-2.5 py-1 text-[10px] font-bold text-brand-soft">{t.metric}</span>
              </div>
              <p className="mt-3.5 flex-1 text-[13.5px] leading-relaxed text-white/70">“{t.text}”</p>
              <div className="mt-5 flex items-center gap-3 border-t border-white/8 pt-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand/50 to-neon/40 font-display text-[11px] font-bold ring-1 ring-white/15">
                  {t.initials}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold">{t.name}</p>
                  <p className="truncate text-[11px] text-white/40">{t.role}</p>
                </div>
              </div>
            </div>
          </SpotlightCard>
        ))}
      </div>

      <div className="mt-14 flex flex-col items-center gap-4 text-center">
        <h2 className="font-display text-2xl font-bold tracking-tight">Join them</h2>
        <div className="flex flex-wrap justify-center gap-3">
          <button onClick={() => nav("auth")} className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-brand to-brand-soft px-7 py-3.5 text-[14px] font-semibold text-ink glow-brand transition-shadow hover:shadow-[0_0_44px_rgba(0,211,149,0.6)]">
            Get started free <ArrowRight className="h-4 w-4" />
          </button>
          <button onClick={() => nav("how")} className="glass rounded-2xl px-7 py-3.5 text-[14px] font-semibold text-white/85 transition-colors hover:border-white/25">
            How it works
          </button>
        </div>
      </div>
    </div>
  );
}
