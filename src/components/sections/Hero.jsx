import { useState } from "react";
import { Clock, BadgeCheck, ArrowRight } from "lucide-react";
import SplitText from "../fx/SplitText.jsx";
import BlurText from "../fx/BlurText.jsx";
import TiltedCard from "../fx/TiltedCard.jsx";
import CountUp from "../fx/CountUp.jsx";
import AmbientOrb from "../fx/AmbientOrb.jsx";
import { STATS, TAGS } from "../../data/mock.js";
import { useNav } from "../../nav.jsx";

function MiniStepper() {
  return (
    <div className="flex items-center gap-1.5">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex flex-1 items-center gap-1.5">
          <span
            className={
              i < 2
                ? "h-2.5 w-2.5 rounded-full bg-brand-soft shadow-[0_0_10px_rgba(52,227,173,0.8)]"
                : i === 2
                  ? "h-2.5 w-2.5 animate-pulse-soft rounded-full bg-neon shadow-[0_0_12px_rgba(6,182,212,0.9)]"
                  : "h-2.5 w-2.5 rounded-full bg-white/15"
            }
          />
          {i < 3 && (
            <span
              className={`h-px flex-1 ${i < 2 ? "bg-brand-soft/60" : "bg-white/10"}`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function DashboardPreview() {
  return (
    <TiltedCard className="relative animate-float">
      <div className="glass w-full max-w-md rounded-2xl p-5 glow-brand">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-display text-[15px] font-semibold">
              Checkout flow revamp
            </p>
            <p className="mt-0.5 text-[11px] text-white/45">
              Nova Studio · Milestone 2 of 4
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-neon/30 bg-neon/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-neon">
            <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-neon" />
            In progress
          </span>
        </div>

        <div className="mt-5">
          <MiniStepper />
        </div>

        <div className="mt-5 rounded-xl border border-white/8 bg-white/[0.03] p-3">
          <div className="flex items-center justify-between text-[11px] text-white/50">
            <span>Phase 1 · Development</span>
            <span className="font-semibold text-white/80">68%</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/8">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand to-neon"
              style={{ width: "68%" }}
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-[11px] text-white/50">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-brand-soft" />
            42.5h logged / 60h est.
          </span>
          <span className="inline-flex items-center gap-1.5">
            <BadgeCheck className="h-3.5 w-3.5 text-mint" />
            Escrow funded
          </span>
        </div>
      </div>

      <div className="glass absolute -right-4 -top-5 animate-float-slow rounded-xl px-3.5 py-2.5 text-[11px] font-semibold text-mint glow-mint">
        +$2,400 released
      </div>
      <div className="glass absolute -bottom-5 -left-4 animate-float-slow rounded-xl px-3.5 py-2.5 text-[11px] font-semibold text-brand-soft [animation-delay:1.4s]">
        98% AI match
      </div>
    </TiltedCard>
  );
}

export default function Hero() {
  const { nav } = useNav();
  const [query, setQuery] = useState("");
  const searchTalent = (val) =>
    nav("find-talent", val && val.trim() ? { query: val } : null);

  return (
    <section id="top" className="relative overflow-hidden pb-12 pt-32 md:pb-20 md:pt-36">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-brand/20 blur-[140px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-[-120px] top-1/3 h-[380px] w-[380px] rounded-full bg-neon/10 blur-[120px]"
      />

      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <h1 className="font-display text-[clamp(2.6rem,5.5vw,4.3rem)] font-bold leading-[1.02] tracking-tight">
            <SplitText text="Elite work meets" />
            <br />
            <span className="bg-gradient-to-r from-brand-soft via-neon to-mint bg-clip-text text-transparent [filter:drop-shadow(0_2px_18px_rgba(52,227,173,0.4))]">
              elite talent.
            </span>
          </h1>

          <p className="mt-6 max-w-md text-[15px] leading-relaxed text-white/55">
            <BlurText
              text="Post a brief, get AI-matched in hours, and track every milestone in real time — with escrow-protected payments."
              stagger={22}
            />
          </p>

          <div className="glass mt-9 flex max-w-lg items-center gap-2 rounded-full p-2 pl-5 focus-within:border-brand/50">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchTalent(query)}
              placeholder='Try "3D landing page" or "React developer"'
              className="w-full bg-transparent text-[14px] outline-none placeholder:text-white/30"
            />
            <button
              onClick={() => searchTalent(query)}
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-brand py-2 pl-2 pr-4 text-[13px] font-semibold text-ink glow-brand transition-shadow hover:shadow-[0_0_36px_rgba(0,211,149,0.6)]"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink/15">
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
              Search
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {TAGS.map((t, i) => (
              <button
                key={t}
                onClick={() => searchTalent(t)}
                className="animate-float rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-[11px] font-medium text-white/55 transition-colors hover:border-brand/50 hover:text-brand-soft"
                style={{ animationDelay: `${i * 0.7}s` }}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <button
              onClick={() => nav("find-talent")}
              className="rounded-2xl bg-gradient-to-r from-brand to-brand-soft px-7 py-3.5 text-[14px] font-semibold glow-brand transition-all duration-200 hover:scale-[1.03] hover:shadow-[0_0_44px_rgba(0,211,149,0.65)]"
            >
              Find Talent
            </button>
            <button
              onClick={() => nav("post-job")}
              className="glass rounded-2xl px-7 py-3.5 text-[14px] font-semibold text-white/85 transition-all duration-200 hover:scale-[1.03] hover:border-white/25"
            >
              Post a Job
            </button>
          </div>
        </div>

        <div className="relative hidden justify-center lg:flex">
          <div className="pointer-events-none absolute -right-16 top-1/2 -z-10 -translate-y-1/2 opacity-80">
            <AmbientOrb size={420} />
          </div>
          <DashboardPreview />
        </div>
      </div>

      <div className="relative mx-auto mt-20 grid max-w-6xl grid-cols-2 gap-6 border-t border-white/8 px-6 pt-10 md:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.label}>
            <p className="font-display text-3xl font-bold">
              <CountUp
                to={s.value}
                prefix={s.prefix || ""}
                suffix={s.suffix || ""}
                decimals={s.decimals || 0}
              />
            </p>
            <p className="mt-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-white/40">
              {s.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
