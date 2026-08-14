import { FileText, Sparkles, MessageSquare, ShieldCheck, Rocket, Wallet, Check, ArrowRight } from "lucide-react";
import BlurText from "../fx/BlurText.jsx";
import SpotlightCard from "../fx/SpotlightCard.jsx";
import { useNav } from "../../nav.jsx";
import { useT } from "../../i18n.jsx";

// Модулийн түвшний жагсаалт тул t()-г энд дуудаж болохгүй — түлхүүрээ
// авч яваад рендэрлэх үедээ орчуулна.
const CLIENT = [
  { Icon: FileText, titleKey: "hiw.c1", descKey: "hiw.c1d" },
  { Icon: Sparkles, titleKey: "hiw.c2", descKey: "hiw.c2d" },
  { Icon: MessageSquare, titleKey: "hiw.c3", descKey: "hiw.c3d" },
  { Icon: ShieldCheck, titleKey: "hiw.c4", descKey: "hiw.c4d" },
];

const FREELANCER = [
  { Icon: Rocket, titleKey: "hiw.f1", descKey: "hiw.f1d" },
  { Icon: Sparkles, titleKey: "hiw.f2", descKey: "hiw.f2d" },
  { Icon: MessageSquare, titleKey: "hiw.f3", descKey: "hiw.f3d" },
  { Icon: Wallet, titleKey: "hiw.f4", descKey: "hiw.f4d" },
];

const ESCROW_STEPS = ["hiw.s1", "hiw.s2", "hiw.s3"];

function Journey({ label, steps, accent, t }) {
  return (
    <SpotlightCard spotColor={accent === "mint" ? "rgba(127, 168, 138, 0.14)" : "rgba(123, 57, 252, 0.16)"}>
      <div className="p-7">
        <span className="rounded-full border border-brand/30 bg-brand/10 px-3.5 py-1.5 text-[10.5px] font-bold uppercase tracking-widest text-brand-soft">
          {label}
        </span>
        <div className="mt-6 space-y-5">
          {steps.map(({ Icon, titleKey, descKey }, i) => (
            <div key={titleKey} className="flex gap-4">
              <div className="flex flex-col items-center">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand/30 bg-brand/10 text-brand-soft">
                  <Icon className="h-4.5 w-4.5" />
                </span>
                {i < steps.length - 1 && <span className="mt-1 w-px flex-1 bg-white/10" />}
              </div>
              <div className="pb-1">
                <p className="text-[14.5px] font-semibold">
                  <span className="mr-2 font-display text-brand-soft">{i + 1}.</span>{t(titleKey)}
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-white/50">{t(descKey)}</p>
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
  const t = useT();
  return (
    <div className="mx-auto max-w-6xl px-6 pb-24 pt-36">
      <div className="text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-soft">{t("hiw.eyebrow")}</p>
        <h1 className="mx-auto mt-4 max-w-2xl font-display text-[clamp(2.2rem,4.5vw,3.4rem)] font-bold text-brand text-glow leading-[1.05] tracking-tight">
          <BlurText text={t("hiw.title")} />
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-white/55">
          {t("hiw.intro")}
        </p>
      </div>

      <div className="mt-14 grid gap-5 lg:grid-cols-2">
        <Journey label={t("hiw.forClients")} steps={CLIENT} t={t} />
        <Journey label={t("hiw.forFreelancers")} steps={FREELANCER} accent="mint" t={t} />
      </div>

      {/* Escrow band */}
      <div className="glass mt-6 rounded-3xl p-8 md:p-10">
        <div className="grid items-center gap-8 md:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="inline-flex items-center gap-2 text-[12.5px] font-semibold text-mint">
              <ShieldCheck className="h-4 w-4" /> {t("hiw.escrowBadge")}
            </p>
            <h2 className="mt-3 font-display text-2xl font-bold tracking-tight">
              {t("hiw.escrowTitle")}
            </h2>
            {/* Хугацааны амлалтыг санаатайгаар хассан: Маргаан шийдвэрлэх
                журам нь тогтмол SLA баталгаагүй гэж бичсэн байхад энэ
                хуудас "48 цагийн дотор" гэж амлаж байсан. */}
            <p className="mt-3 max-w-md text-[13.5px] leading-relaxed text-white/55">
              {t("hiw.escrowDesc")}
            </p>
            <button
              onClick={() => nav("trust")}
              className="mt-5 inline-flex items-center gap-2 rounded-xl border border-mint/40 bg-mint/10 px-5 py-2.5 text-[13px] font-bold text-mint transition-all hover:bg-mint hover:text-ink"
            >
              {t("hiw.learnTrust")} <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-3">
            {ESCROW_STEPS.map((key, i) => (
              <div key={key} className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-4">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${i === 0 ? "bg-brand text-ink" : "border border-white/15 text-white/60"}`}>
                  {i + 1}
                </span>
                <span className="text-[13px] text-white/75">{t(key)}</span>
                {i === 2 && <Check className="ml-auto h-4 w-4 text-mint" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="mt-14 flex flex-col items-center gap-4 text-center">
        <h2 className="font-display text-2xl font-bold tracking-tight">{t("hiw.ready")}</h2>
        <div className="flex flex-wrap justify-center gap-3">
          <button onClick={() => nav("post-job")} className="rounded-2xl bg-brand px-7 py-3.5 text-[14px] font-semibold text-fg-1 glow-brand transition-shadow">
            {t("hiw.postJob")}
          </button>
          <button onClick={() => nav("find-work")} className="glass rounded-2xl px-7 py-3.5 text-[14px] font-semibold text-white/85 transition-colors hover:border-white/25">
            {t("hiw.findWork")}
          </button>
        </div>
      </div>
    </div>
  );
}
