import { ShieldCheck } from "lucide-react";
import { useNav } from "../../nav.jsx";
import { useT } from "../../i18n.jsx";

const COLS = [
  {
    titleKey: "ftr.forFreelancers",
    links: [
      { labelKey: "ftr.findWork", page: "find-work" },
      { labelKey: "ftr.browseCategories", page: "home", anchor: "#categories" },
      { labelKey: "ftr.howItWorks", page: "how" },
      { labelKey: "ftr.getVerified", page: "trust" },
      { labelKey: "ftr.freelancerReviews", page: "reviews" },
    ],
  },
  {
    titleKey: "ftr.forClients",
    links: [
      { labelKey: "ftr.findTalent", page: "find-talent" },
      { labelKey: "ftr.postJob", page: "post-job" },
      { labelKey: "ftr.pricing", page: "home", anchor: "#pricing" },
      { labelKey: "ftr.aiMatching", page: "home", anchor: "#ai" },
      { labelKey: "ftr.escrowPayments", page: "trust" },
    ],
  },
  {
    titleKey: "ftr.company",
    links: [
      { labelKey: "ftr.about", page: "how" },
      { labelKey: "ftr.trustSafety", page: "trust" },
      { labelKey: "ftr.reviews", page: "reviews" },
      { labelKey: "ftr.careers", page: "contact" },
      { labelKey: "ftr.contactUs", page: "contact" },
    ],
  },
  {
    titleKey: "ftr.support",
    links: [
      { labelKey: "ftr.helpCenter", page: "help" },
      { labelKey: "ftr.faq", page: "help" },
      { labelKey: "ftr.disputes", page: "dispute-policy" },
      { labelKey: "ftr.privacy", page: "help" },
      { labelKey: "ftr.terms", page: "terms" },
    ],
  },
];

export default function Footer() {
  const { nav } = useNav();
  const t = useT();

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
            {t("ftr.tagline")}
          </p>
          <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-mint/25 bg-mint/10 px-3 py-1.5 text-[11px] font-medium text-mint">
            <ShieldCheck className="h-3.5 w-3.5" />
            {t("ftr.escrowBadge")}
          </p>
        </div>
        {COLS.map((c) => (
          <div key={c.titleKey}>
            <p className="text-[12px] font-semibold uppercase tracking-widest text-white/40">{t(c.titleKey)}</p>
            <ul className="mt-4 space-y-2.5">
              {c.links.map((l) => (
                <li key={l.labelKey}>
                  <button
                    onClick={() => go(l)}
                    className="text-[13px] text-white/60 transition-colors hover:text-brand-soft"
                  >
                    {t(l.labelKey)}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-12 text-center text-[12px] text-white/30">
        {t("ftr.copyright")}
      </p>
    </footer>
  );
}
