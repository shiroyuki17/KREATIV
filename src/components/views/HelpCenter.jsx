import { useMemo, useState } from "react";
import { Search, ChevronDown, Rocket, Wallet, User, ShieldCheck, Briefcase, LifeBuoy, MessageSquare } from "lucide-react";
import BlurText from "../fx/BlurText.jsx";
import { useNav } from "../../nav.jsx";

const TOPICS = [
  { Icon: Rocket, title: "Getting started", count: 12 },
  { Icon: Wallet, title: "Payments & escrow", count: 18 },
  { Icon: User, title: "Account & profile", count: 9 },
  { Icon: ShieldCheck, title: "Trust & safety", count: 14 },
  { Icon: Briefcase, title: "For clients", count: 11 },
  { Icon: LifeBuoy, title: "For freelancers", count: 15 },
];

const FAQ = [
  { q: "How does escrow protect my payment?", a: "The client funds each milestone into escrow before work begins. The money is locked — neither side can touch it — and releases to the freelancer the moment the milestone is approved. If there's a dispute, a human specialist resolves it within 48 hours." },
  { q: "What are the fees?", a: "Starter is free with a 10% escrow commission. Pro is $29/mo with a 5% commission, unlimited proposals, and AI matchmaking. Enterprise drops to 2%. Commission only applies when a payment is actually released." },
  { q: "How fast will I get matched?", a: "Most briefs are AI-matched to vetted specialists within a few hours — the platform average is about 3.2 hours." },
  { q: "What if a freelancer never delivers?", a: "Your money stays in escrow until you approve the work. If a freelancer disappears or the delivery doesn't match the agreed scope, open a dispute and you'll get a full refund through the 48-hour resolution process." },
  { q: "What if a client refuses to pay?", a: "They already funded escrow before you started, so the money exists. If they go silent, open a dispute from the project tracker and a human releases the funds to you within 48 hours." },
  { q: "How do withdrawals work?", a: "Available balance can be withdrawn to your linked card or bank from the Payments page. Payouts typically arrive within 1–2 business days." },
  { q: "Can I work with the same freelancer again?", a: "Yes — hire past collaborators directly from your project history or their profile, and start a new escrow-protected contract in a click." },
];

function Accordion({ item, open, onToggle }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] transition-colors hover:border-white/15">
      <button onClick={onToggle} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left">
        <span className="text-[14px] font-semibold">{item.q}</span>
        <ChevronDown className={`h-4.5 w-4.5 shrink-0 text-white/40 transition-transform ${open ? "rotate-180 text-brand-soft" : ""}`} />
      </button>
      {open && <p className="animate-feed-in px-5 pb-5 text-[13.5px] leading-relaxed text-white/55">{item.a}</p>}
    </div>
  );
}

export default function HelpCenter() {
  const { nav } = useNav();
  const [q, setQ] = useState("");
  const [openIdx, setOpenIdx] = useState(0);

  const results = useMemo(
    () => FAQ.filter((f) => q.trim() === "" || (f.q + f.a).toLowerCase().includes(q.toLowerCase())),
    [q]
  );

  return (
    <div className="mx-auto max-w-5xl px-6 pb-24 pt-36">
      <div className="text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-soft">— Help center</p>
        <h1 className="mt-4 font-display text-[clamp(2rem,4vw,3rem)] font-bold text-brand text-glow tracking-tight">
          <BlurText text="How can we help?" />
        </h1>
        <div className="mx-auto mt-7 flex max-w-xl items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 focus-within:border-brand/50">
          <Search className="h-5 w-5 shrink-0 text-white/40" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search articles — escrow, fees, withdrawals…"
            className="w-full bg-transparent text-[14px] outline-none placeholder:text-white/30"
          />
        </div>
      </div>

      {q.trim() === "" && (
        <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-3">
          {TOPICS.map(({ Icon, title, count }) => (
            <button
              key={title}
              onClick={() => setQ(title.split(" ")[0])}
              className="glass rounded-2xl p-5 text-left transition-all hover:border-brand/40 hover:-translate-y-0.5"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-brand/30 bg-brand/10 text-brand-soft">
                <Icon className="h-4.5 w-4.5" />
              </span>
              <p className="mt-4 text-[14px] font-semibold">{title}</p>
              <p className="mt-0.5 text-[11.5px] text-white/40">{count} articles</p>
            </button>
          ))}
        </div>
      )}

      <div className="mt-12">
        <h2 className="mb-4 font-display text-lg font-bold">
          {q.trim() === "" ? "Popular questions" : `${results.length} result${results.length === 1 ? "" : "s"}`}
        </h2>
        <div className="space-y-2.5">
          {results.map((item, i) => (
            <Accordion key={item.q} item={item} open={openIdx === i} onToggle={() => setOpenIdx(openIdx === i ? -1 : i)} />
          ))}
          {results.length === 0 && (
            <p className="rounded-2xl border border-white/8 bg-white/[0.02] p-8 text-center text-[13.5px] text-white/45">
              No articles match “{q}”. Try a different term or contact support.
            </p>
          )}
        </div>
      </div>

      <div className="glass mt-10 flex flex-col items-center gap-3 rounded-3xl p-8 text-center">
        <MessageSquare className="h-8 w-8 text-brand-soft" />
        <h2 className="font-display text-xl font-bold">Still need a hand?</h2>
        <p className="max-w-sm text-[13px] text-white/50">Our team replies within a few hours — every day of the week.</p>
        <button onClick={() => nav("contact")} className="mt-2 rounded-xl bg-brand px-6 py-3 text-[13.5px] font-bold text-ink glow-brand">
          Contact support
        </button>
      </div>
    </div>
  );
}
