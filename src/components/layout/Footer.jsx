import { ShieldCheck } from "lucide-react";
import { useNav } from "../../nav.jsx";

const COLS = [
  {
    title: "For freelancers",
    links: [
      { label: "Find work", page: "find-work" },
      { label: "Browse categories", page: "home", anchor: "#categories" },
      { label: "How it works", page: "how" },
      { label: "Get verified", page: "trust" },
      { label: "Freelancer reviews", page: "reviews" },
    ],
  },
  {
    title: "For clients",
    links: [
      { label: "Find talent", page: "find-talent" },
      { label: "Post a job", page: "post-job" },
      { label: "Pricing", page: "home", anchor: "#pricing" },
      { label: "AI matching", page: "home", anchor: "#ai" },
      { label: "Escrow & payments", page: "trust" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", page: "how" },
      { label: "Trust & safety", page: "trust" },
      { label: "Reviews", page: "reviews" },
      { label: "Careers", page: "contact" },
      { label: "Contact us", page: "contact" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Help center", page: "help" },
      { label: "FAQ", page: "help" },
      { label: "Dispute resolution", page: "dispute-policy" },
      { label: "Privacy policy", page: "help" },
      { label: "Terms of service", page: "terms" },
    ],
  },
];

export default function Footer() {
  const { nav } = useNav();

  const go = (link) => {
    nav(link.page);
    if (link.anchor) setTimeout(() => document.querySelector(link.anchor)?.scrollIntoView({ behavior: "smooth" }), 90);
  };

  return (
    <footer className="relative border-t border-white/8 py-14">
      <div className="mx-auto grid max-w-6xl gap-x-8 gap-y-10 px-6 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1fr_1fr]">
        <div>
          <button onClick={() => nav("home")} className="font-display text-lg font-bold tracking-tight">
            KRE
            <span className="bg-gradient-to-r from-brand-soft to-neon bg-clip-text text-transparent">ATIV</span>
          </button>
          <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-white/45">
            The design-first marketplace where elite freelancers and ambitious
            teams ship exceptional work.
          </p>
          <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-mint/25 bg-mint/10 px-3 py-1.5 text-[11px] font-medium text-mint">
            <ShieldCheck className="h-3.5 w-3.5" />
            Escrow-protected payments
          </p>
        </div>
        {COLS.map((c) => (
          <div key={c.title}>
            <p className="text-[12px] font-semibold uppercase tracking-widest text-white/40">{c.title}</p>
            <ul className="mt-4 space-y-2.5">
              {c.links.map((l) => (
                <li key={l.label}>
                  <button
                    onClick={() => go(l)}
                    className="text-[13px] text-white/60 transition-colors hover:text-brand-soft"
                  >
                    {l.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-12 text-center text-[12px] text-white/30">
        © 2026 KREATIV — Built for elite work.
      </p>
    </footer>
  );
}
