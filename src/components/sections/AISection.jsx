import { Sparkles, ShieldCheck, Gauge, ArrowRight } from "lucide-react";
import BlurText from "../fx/BlurText.jsx";
import TiltedCard from "../fx/TiltedCard.jsx";
import Magnet from "../fx/Magnet.jsx";
import { useT } from "../../i18n.jsx";

// Өмнө нь "98% fit accuracy" ба "48,000 delivered projects" гэсэн хоёр тоо
// байв — аль нь ч ямар нэг өгөгдөлд тулгуурладаггүй, шинэ платформ дээр
// нэн ялангуяа худал. Тоог нь хассан; функц нь өөрөө бодит.
const FEATURES = [
  { Icon: Sparkles, titleKey: "home.aiFeat1", descKey: "home.aiFeat1Desc" },
  { Icon: Gauge, titleKey: "home.aiFeat2", descKey: "home.aiFeat2Desc" },
  { Icon: ShieldCheck, titleKey: "home.aiFeat3", descKey: "home.aiFeat3Desc" },
];

export default function AISection() {
  const t = useT();
  const openChat = () => window.dispatchEvent(new Event("open-kreativ-chat"));

  return (
    <section id="ai" className="relative py-12 md:py-24">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-[-140px] top-1/4 h-[400px] w-[400px] rounded-full bg-brand/12 blur-[130px]"
      />
      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-soft">
            {t("home.aiEyebrow")}
          </p>
          <h2 className="mt-3 max-w-md font-display text-[clamp(1.9rem,3.6vw,2.8rem)] font-bold text-brand text-glow leading-tight tracking-tight">
            <BlurText text={t("home.aiTitle")} />
          </h2>

          <div className="mt-8 space-y-5">
            {FEATURES.map(({ Icon, titleKey, descKey }) => (
              <div key={titleKey} className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand/30 bg-brand/10 text-brand-soft">
                  <Icon className="h-4.5 w-4.5" />
                </span>
                <div>
                  <p className="text-[14.5px] font-semibold">{t(titleKey)}</p>
                  <p className="mt-1 max-w-sm text-[12.5px] leading-relaxed text-white/50">{t(descKey)}</p>
                </div>
              </div>
            ))}
          </div>

          <Magnet strength={0.2} className="mt-9">
            <button
              onClick={openChat}
              className="inline-flex items-center gap-2 rounded-2xl bg-brand px-7 py-3.5 text-[14px] font-semibold glow-brand transition-shadow"
            >
              <Sparkles className="h-4 w-4" />
              {t("home.tryAssistant")}
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
                {t("home.aiOnline")}
              </span>
            </div>

            <div className="mt-5 space-y-3">
              <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-brand px-4 py-3 text-[13px] leading-relaxed">
                {t("home.aiDemoUser")}
              </div>
              <div className="max-w-[90%] rounded-2xl rounded-bl-md border border-white/8 bg-white/[0.05] px-4 py-3 text-[13px] leading-relaxed text-white/80">
                <b className="text-brand-soft">3 {t("home.aiDemoBotA")}</b> {t("home.aiDemoBotB")}{" "}
                <b>Daniel Kim</b> {t("home.aiDemoBotC")}
              </div>
              <div className="flex gap-2">
                <span className="rounded-full border border-brand/40 bg-brand/10 px-3.5 py-1.5 text-[11px] font-semibold text-brand-soft">
                  {t("home.aiDemoYes")}
                </span>
                <span className="rounded-full border border-white/10 px-3.5 py-1.5 text-[11px] font-medium text-white/50">
                  {t("home.aiDemoSeeAll")} 3
                </span>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3 text-[12px] text-white/30">
              {t("home.aiDemoPlaceholder")}
              <ArrowRight className="ml-auto h-3.5 w-3.5 text-brand-soft" />
            </div>
          </div>
        </TiltedCard>
      </div>
    </section>
  );
}
