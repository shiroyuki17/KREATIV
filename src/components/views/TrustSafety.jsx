import {
  ShieldCheck,
  Lock,
  UserCheck,
  Scale,
  Eye,
  Bot,
  Check,
  Clock,
  AlertTriangle,
  FileSearch,
  ArrowRight,
} from "lucide-react";
import BlurText from "../fx/BlurText.jsx";
import SpotlightCard from "../fx/SpotlightCard.jsx";
import Magnet from "../fx/Magnet.jsx";
import CountUp from "../fx/CountUp.jsx";
import { useNav } from "../../nav.jsx";

const STATS = [
  { value: 32, prefix: "$", suffix: "M", label: "Protected in escrow" },
  { value: 99.2, suffix: "%", decimals: 1, label: "Disputes resolved fairly" },
  { value: 48, suffix: "h", label: "Max. dispute resolution" },
  { value: 100, suffix: "%", label: "ID-verified payouts" },
];

const PROTECTIONS = [
  { Icon: ShieldCheck, title: "Escrow on every contract", desc: "Money is locked before work starts and released only on your approval. No exceptions.", cls: "text-mint border-mint/30 bg-mint/10" },
  { Icon: UserCheck, title: "Identity verification", desc: "Every payout account passes KYC. Verified badges mean a real, accountable human.", cls: "text-neon border-neon/30 bg-neon/10" },
  { Icon: Scale, title: "Human dispute resolution", desc: "A trained specialist — not an algorithm — reviews evidence and decides within 48 hours.", cls: "text-brand-soft border-brand/30 bg-brand/10" },
  { Icon: Bot, title: "AI fraud monitoring", desc: "Our models flag fake briefs, cloned portfolios, and off-platform payment bait in real time.", cls: "text-brand-soft border-brand/30 bg-brand/10" },
  { Icon: Lock, title: "Encrypted everything", desc: "Messages, files, and payment data are encrypted in transit and at rest.", cls: "text-neon border-neon/30 bg-neon/10" },
  { Icon: Eye, title: "Transparent history", desc: "Every milestone, payment, and revision is timestamped and auditable by both sides.", cls: "text-mint border-mint/30 bg-mint/10" },
];

const ESCROW_STEPS = [
  { title: "Client funds escrow", desc: "Money is locked before any work begins" },
  { title: "Freelancer delivers", desc: "Progress tracked milestone by milestone" },
  { title: "Client approves", desc: "Review deliverables, request revisions" },
  { title: "Instant payout", desc: "Funds release the moment it's approved" },
];

const DISPUTE_STEPS = [
  { Icon: AlertTriangle, title: "Report an issue", time: "Any time", desc: "One click from the project tracker — the contract freezes instantly." },
  { Icon: FileSearch, title: "Evidence review", time: "Within 24h", desc: "Both sides submit messages, files, and milestone history." },
  { Icon: Scale, title: "Human decision", time: "Within 48h", desc: "A resolution specialist decides based on the agreed scope." },
  { Icon: Check, title: "Funds move", time: "Instant", desc: "Released to the freelancer or refunded to the client. Case closed." },
];

export default function TrustSafety() {
  const { nav } = useNav();

  return (
    <div className="mx-auto max-w-6xl px-6 pb-24 pt-36">
      <div className="text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-mint">
          — Trust & Safety
        </p>
        <h1 className="mx-auto mt-4 max-w-2xl font-display text-[clamp(2.2rem,4.5vw,3.4rem)] font-bold leading-[1.05] tracking-tight">
          <BlurText text="Your money is protected." />
          <span className="bg-gradient-to-r from-mint via-neon to-brand-soft bg-clip-text text-transparent">
            <BlurText text="Period." delay={300} />
          </span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-white/55">
          The biggest fear in freelancing is simple: doing the work and never
          getting paid — or paying and never getting the work. KREATIV is built
          so that neither can happen.
        </p>
      </div>

      <div className="mt-14 grid grid-cols-2 gap-4 md:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.label} className="glass rounded-2xl p-5 text-center">
            <p className="font-display text-3xl font-bold text-mint">
              <CountUp to={s.value} prefix={s.prefix || ""} suffix={s.suffix || ""} decimals={s.decimals || 0} />
            </p>
            <p className="mt-1.5 text-[10.5px] font-medium uppercase tracking-wider text-white/40">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {/* The #1 fear, solved */}
      <div className="mt-16 grid gap-5 md:grid-cols-2">
        <SpotlightCard spotColor="rgba(16, 185, 129, 0.14)">
          <div className="p-7">
            <span className="inline-flex items-center gap-2 rounded-full border border-mint/30 bg-mint/10 px-3.5 py-1.5 text-[10.5px] font-bold uppercase tracking-widest text-mint">
              For freelancers
            </span>
            <h3 className="mt-4 font-display text-xl font-bold">
              “What if the client never pays?”
            </h3>
            <p className="mt-3 text-[13.5px] leading-relaxed text-white/60">
              They already did. Work never starts until the client's money is
              locked in escrow — you'll see the{" "}
              <span className="font-semibold text-mint">Escrow funded</span>{" "}
              badge before you touch a single file. If a client vanishes or
              refuses to respond, the funds are still there: open a dispute and
              a human releases them to you within 48 hours.
            </p>
            <ul className="mt-5 space-y-2.5">
              {["No escrow, no start — enforced by the platform", "Client silence ≠ lost income", "Off-platform payment requests are auto-flagged"].map((li) => (
                <li key={li} className="flex items-start gap-2.5 text-[13px] text-white/70">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-mint" />
                  {li}
                </li>
              ))}
            </ul>
          </div>
        </SpotlightCard>

        <SpotlightCard>
          <div className="p-7">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3.5 py-1.5 text-[10.5px] font-bold uppercase tracking-widest text-brand-soft">
              For clients
            </span>
            <h3 className="mt-4 font-display text-xl font-bold">
              “What if the work never arrives?”
            </h3>
            <p className="mt-3 text-[13.5px] leading-relaxed text-white/60">
              Your money sits in escrow — not in anyone's pocket. Nothing is
              released until you approve each milestone. If a freelancer
              disappears or delivers something that doesn't match the agreed
              scope, you get a{" "}
              <span className="font-semibold text-brand-soft">full refund</span>{" "}
              through the same 48-hour dispute process.
            </p>
            <ul className="mt-5 space-y-2.5">
              {["Approve milestone by milestone, never all at once", "Scope is written into the contract", "No delivery → escrow returns to you"].map((li) => (
                <li key={li} className="flex items-start gap-2.5 text-[13px] text-white/70">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-soft" />
                  {li}
                </li>
              ))}
            </ul>
          </div>
        </SpotlightCard>
      </div>

      {/* How escrow works */}
      <div className="mt-16">
        <h2 className="text-center font-display text-2xl font-bold tracking-tight">
          How escrow makes scams impossible
        </h2>
        <div className="glass mt-8 rounded-2xl p-7">
          <div className="grid gap-6 md:grid-cols-4">
            {ESCROW_STEPS.map((s, i) => (
              <div key={s.title} className="relative">
                <span
                  className={
                    i === 0
                      ? "flex h-10 w-10 items-center justify-center rounded-full bg-mint font-display text-[14px] font-bold text-ink shadow-[0_0_20px_rgba(16,185,129,0.55)]"
                      : "flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] font-display text-[14px] font-bold text-white/60"
                  }
                >
                  {i + 1}
                </span>
                <p className="mt-3.5 text-[14px] font-semibold">{s.title}</p>
                <p className="mt-1 text-[12px] leading-relaxed text-white/45">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Protection grid */}
      <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PROTECTIONS.map(({ Icon, title, desc, cls }) => (
          <SpotlightCard key={title}>
            <div className="p-6">
              <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border ${cls}`}>
                <Icon className="h-4.5 w-4.5" />
              </span>
              <p className="mt-4 text-[14.5px] font-semibold">{title}</p>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-white/50">{desc}</p>
            </div>
          </SpotlightCard>
        ))}
      </div>

      {/* Dispute timeline */}
      <div className="mt-16">
        <h2 className="text-center font-display text-2xl font-bold tracking-tight">
          If something goes wrong
        </h2>
        <p className="mx-auto mt-2 max-w-md text-center text-[13px] text-white/45">
          A clear, human process — resolved in 48 hours, not weeks.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-4">
          {DISPUTE_STEPS.map(({ Icon, title, time, desc }, i) => (
            <div key={title} className="glass rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-neon/30 bg-neon/10 text-neon">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-white/35">
                  <Clock className="h-3 w-3" />
                  {time}
                </span>
              </div>
              <p className="mt-4 text-[13.5px] font-semibold">{title}</p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-white/45">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="glass mt-16 rounded-3xl p-10 text-center">
        <ShieldCheck className="mx-auto h-10 w-10 text-mint" />
        <h2 className="mt-4 font-display text-2xl font-bold tracking-tight">
          Work with confidence
        </h2>
        <p className="mx-auto mt-2 max-w-md text-[13.5px] text-white/50">
          Join 12,000+ freelancers and thousands of teams who never worry about
          getting paid — or getting delivered.
        </p>
        <Magnet strength={0.15} className="mt-6">
          <button
            onClick={() => nav("auth")}
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-mint to-emerald-400 px-8 py-3.5 text-[14px] font-bold text-ink glow-mint transition-shadow hover:shadow-[0_0_50px_rgba(16,185,129,0.6)]"
          >
            Get protected — it's free
            <ArrowRight className="h-4 w-4" />
          </button>
        </Magnet>
      </div>
    </div>
  );
}
