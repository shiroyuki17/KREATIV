import { Sparkles, ShieldCheck, Gauge, ArrowRight } from "lucide-react";
import BlurText from "../fx/BlurText.jsx";
import TiltedCard from "../fx/TiltedCard.jsx";
import Magnet from "../fx/Magnet.jsx";

const FEATURES = [
  { Icon: Sparkles, title: "AI matching, 98% fit accuracy", desc: "Describe your project in plain language — the engine shortlists vetted talent on skills, budget, and availability." },
  { Icon: Gauge, title: "Live price benchmarking", desc: "Know instantly if a bid is fair. The AI compares it against 48,000 delivered projects." },
  { Icon: ShieldCheck, title: "Fraud screening built in", desc: "Fake briefs, cloned portfolios, and off-platform payment bait are flagged before they reach you." },
];

export default function AISection() {
  const openChat = () => window.dispatchEvent(new Event("open-kreativ-chat"));

  return (
    <section id="ai" className="relative py-24">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-[-140px] top-1/4 h-[400px] w-[400px] rounded-full bg-brand/12 blur-[130px]"
      />
      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-soft">
            — AI at the core
          </p>
          <h2 className="mt-3 max-w-md font-display text-[clamp(1.9rem,3.6vw,2.8rem)] font-bold text-brand text-glow leading-tight tracking-tight">
            <BlurText text="Describe it. The AI builds your shortlist." />
          </h2>

          <div className="mt-8 space-y-5">
            {FEATURES.map(({ Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand/30 bg-brand/10 text-brand-soft">
                  <Icon className="h-4.5 w-4.5" />
                </span>
                <div>
                  <p className="text-[14.5px] font-semibold">{title}</p>
                  <p className="mt-1 max-w-sm text-[12.5px] leading-relaxed text-white/50">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <Magnet strength={0.2} className="mt-9">
            <button
              onClick={openChat}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-brand to-brand-soft px-7 py-3.5 text-[14px] font-semibold glow-brand transition-shadow hover:shadow-[0_0_44px_rgba(0,211,149,0.6)]"
            >
              <Sparkles className="h-4 w-4" />
              Try the AI Assistant
            </button>
          </Magnet>
        </div>

        <TiltedCard className="hidden lg:block">
          <div className="glass rounded-2xl p-6 glow-brand">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-brand/40 bg-brand/15">
                <Sparkles className="h-4 w-4 text-brand-soft" />
              </span>
              <p className="text-[12px] font-semibold uppercase tracking-widest text-white/45">
                KREATIV AI
              </p>
              <span className="ml-auto inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-mint">
                <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-mint" />
                Online
              </span>
            </div>

            <div className="mt-5 space-y-3">
              <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-gradient-to-r from-brand to-brand-soft px-4 py-3 text-[13px] leading-relaxed">
                I need a React developer for a booking platform. Budget around $5k.
              </div>
              <div className="max-w-[90%] rounded-2xl rounded-bl-md border border-white/8 bg-white/[0.05] px-4 py-3 text-[13px] leading-relaxed text-white/80">
                Found <b className="text-brand-soft">3 strong matches</b> in 2.1s.
                Top fit: <b>Daniel Kim</b> — 5.0★, $95/hr, shipped 4 booking
                platforms. Escrow-ready. Want an intro?
              </div>
              <div className="flex gap-2">
                <span className="rounded-full border border-brand/40 bg-brand/10 px-3.5 py-1.5 text-[11px] font-semibold text-brand-soft">
                  Yes, intro me
                </span>
                <span className="rounded-full border border-white/10 px-3.5 py-1.5 text-[11px] font-medium text-white/50">
                  See all 3
                </span>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3 text-[12px] text-white/30">
              Describe your project…
              <ArrowRight className="ml-auto h-3.5 w-3.5 text-brand-soft" />
            </div>
          </div>
        </TiltedCard>
      </div>
    </section>
  );
}
