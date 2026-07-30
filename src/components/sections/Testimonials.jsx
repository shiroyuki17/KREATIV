import { Star, ArrowRight } from "lucide-react";
import SpotlightCard from "../fx/SpotlightCard.jsx";
import BlurText from "../fx/BlurText.jsx";
import { TESTIMONIALS } from "../../data/appMock.js";
import { useNav } from "../../nav.jsx";

export default function Testimonials() {
  const { nav } = useNav();
  return (
    <section id="stories" className="relative py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-soft">— Loved by both sides</p>
            <h2 className="mt-3 font-display text-[clamp(1.9rem,3.6vw,2.8rem)] font-bold text-brand text-glow tracking-tight">
              <BlurText text="Clients and freelancers agree" />
            </h2>
          </div>
          <button
            onClick={() => nav("reviews")}
            className="inline-flex items-center gap-2 rounded-xl border border-white/12 px-5 py-2.5 text-[13px] font-semibold text-white/80 transition-colors hover:border-brand/40 hover:text-white"
          >
            Read success stories <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {TESTIMONIALS.slice(0, 3).map((t) => (
            <SpotlightCard key={t.name}>
              <div className="flex h-full flex-col p-6">
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-4 w-4 ${i < Math.round(t.rating) ? "fill-amber-400 text-amber-400" : "text-white/15"}`} />
                  ))}
                </div>
                <p className="mt-4 flex-1 text-[14px] leading-relaxed text-white/75">“{t.text}”</p>
                <div className="mt-5 flex items-center gap-3 border-t border-white/8 pt-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand/50 to-neon/40 font-display text-[12px] font-bold ring-1 ring-white/15">
                    {t.initials}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-semibold">{t.name}</p>
                    <p className="truncate text-[11.5px] text-white/40">{t.role}</p>
                  </div>
                </div>
              </div>
            </SpotlightCard>
          ))}
        </div>
      </div>
    </section>
  );
}
