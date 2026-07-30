import { FileText, Sparkles, MessageSquare, ShieldCheck, Rocket, Wallet, Check, ArrowRight } from "lucide-react";
import BlurText from "../fx/BlurText.jsx";
import SpotlightCard from "../fx/SpotlightCard.jsx";
import { useNav } from "../../nav.jsx";

const CLIENT = [
  { Icon: FileText, title: "Post your brief", desc: "Describe the work, budget, and timeline in a couple of minutes." },
  { Icon: Sparkles, title: "Get AI-matched", desc: "Our engine shortlists vetted specialists in hours, not weeks." },
  { Icon: MessageSquare, title: "Interview & hire", desc: "Chat, review proposals, and pick the freelancer who fits best." },
  { Icon: ShieldCheck, title: "Pay via escrow", desc: "Fund milestones securely and release only when you approve." },
];

const FREELANCER = [
  { Icon: Rocket, title: "Build your profile", desc: "Showcase skills, portfolio, and rates to stand out." },
  { Icon: Sparkles, title: "Get matched to briefs", desc: "Receive AI-matched work that fits your skills and availability." },
  { Icon: MessageSquare, title: "Deliver milestones", desc: "Collaborate, submit deliverables, and track progress live." },
  { Icon: Wallet, title: "Get paid securely", desc: "Escrow-funded payments release the moment work is approved." },
];

function Journey({ label, steps, accent }) {
  return (
    <SpotlightCard spotColor={accent === "mint" ? "rgba(16,185,129,0.14)" : "rgba(0,211,149,0.16)"}>
      <div className="p-7">
        <span className="rounded-full border border-brand/30 bg-brand/10 px-3.5 py-1.5 text-[10.5px] font-bold uppercase tracking-widest text-brand-soft">
          {label}
        </span>
        <div className="mt-6 space-y-5">
          {steps.map(({ Icon, title, desc }, i) => (
            <div key={title} className="flex gap-4">
              <div className="flex flex-col items-center">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand/30 bg-brand/10 text-brand-soft">
                  <Icon className="h-4.5 w-4.5" />
                </span>
                {i < steps.length - 1 && <span className="mt-1 w-px flex-1 bg-white/10" />}
              </div>
              <div className="pb-1">
                <p className="text-[14.5px] font-semibold">
                  <span className="mr-2 font-display text-brand-soft">{i + 1}.</span>{title}
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-white/50">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SpotlightCard>
  );
}

export default function HowItWorks() {
  const { nav } = useNav();
  return (
    <div className="mx-auto max-w-6xl px-6 pb-24 pt-36">
      <div className="text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-soft">— How it works</p>
        <h1 className="mx-auto mt-4 max-w-2xl font-display text-[clamp(2.2rem,4.5vw,3.4rem)] font-bold text-brand text-glow leading-[1.05] tracking-tight">
          <BlurText text="From brief to delivery — safely." />
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-white/55">
          KREATIV connects clients and elite freelancers with AI matching and
          escrow-protected payments, so great work ships without the risk.
        </p>
      </div>

      <div className="mt-14 grid gap-5 lg:grid-cols-2">
        <Journey label="For clients" steps={CLIENT} />
        <Journey label="For freelancers" steps={FREELANCER} accent="mint" />
      </div>

      {/* Escrow band */}
      <div className="glass mt-6 rounded-3xl p-8 md:p-10">
        <div className="grid items-center gap-8 md:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="inline-flex items-center gap-2 text-[12.5px] font-semibold text-mint">
              <ShieldCheck className="h-4 w-4" /> Escrow-protected, always
            </p>
            <h2 className="mt-3 font-display text-2xl font-bold tracking-tight">
              No one gets scammed. That's the point.
            </h2>
            <p className="mt-3 max-w-md text-[13.5px] leading-relaxed text-white/55">
              Money is locked before work starts and released only on approval.
              Disputes are settled by a human within 48 hours — freelancers never
              chase payment, clients never lose funds.
            </p>
            <button
              onClick={() => nav("trust")}
              className="mt-5 inline-flex items-center gap-2 rounded-xl border border-mint/40 bg-mint/10 px-5 py-2.5 text-[13px] font-bold text-mint transition-all hover:bg-mint hover:text-ink"
            >
              Learn about Trust & Safety <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-3">
            {["Fund milestone into escrow", "Freelancer delivers the work", "You approve — funds release instantly"].map((s, i) => (
              <div key={s} className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-4">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${i === 0 ? "bg-brand text-ink" : "border border-white/15 text-white/60"}`}>
                  {i + 1}
                </span>
                <span className="text-[13px] text-white/75">{s}</span>
                {i === 2 && <Check className="ml-auto h-4 w-4 text-mint" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="mt-14 flex flex-col items-center gap-4 text-center">
        <h2 className="font-display text-2xl font-bold tracking-tight">Ready to start?</h2>
        <div className="flex flex-wrap justify-center gap-3">
          <button onClick={() => nav("post-job")} className="rounded-2xl bg-gradient-to-r from-brand to-brand-soft px-7 py-3.5 text-[14px] font-semibold text-ink glow-brand transition-shadow hover:shadow-[0_0_44px_rgba(0,211,149,0.6)]">
            Post a Job
          </button>
          <button onClick={() => nav("find-work")} className="glass rounded-2xl px-7 py-3.5 text-[14px] font-semibold text-white/85 transition-colors hover:border-white/25">
            Find Work
          </button>
        </div>
      </div>
    </div>
  );
}
