import {
  ShieldCheck,
  Lock,
  UserCheck,
  Scale,
  Eye,
  MessageSquareWarning,
  Check,
  Clock,
  AlertTriangle,
  FileSearch,
  ArrowRight,
} from "lucide-react";
import BlurText from "../fx/BlurText.jsx";
import SpotlightCard from "../fx/SpotlightCard.jsx";
import Magnet from "../fx/Magnet.jsx";
import { useNav } from "../../nav.jsx";
import { useT } from "../../i18n.jsx";

// Дээр нь "$32M escrow-д хамгаалагдсан · маргааны 99.2% шударгаар
// шийдэгдсэн · төлбөрийн 100% ID баталгаажсан" гэсэн дөрвөн тоо байв. Нэг
// ч нь ямар нэг өгөгдлөөс гардаггүй — платформ дээр тэр хэмжээний мөнгө
// хэзээ ч хөдлөөгүй, KYC гэж юм байхгүй. Итгэлийн тухай хуудас худал тоо
// харуулж байсан нь бүхэл сэдвээ ноцтой сулруулж байсан тул хассан:
// амлалтаа тайлбарлая, тоог зохиохгүй.

const PROTECTIONS = [
  { Icon: ShieldCheck, titleKey: "trs.p1", descKey: "trs.p1d", cls: "text-mint border-mint/30 bg-mint/10" },
  // "Every payout account passes KYC" гэж бичсэн байсан — KYC хэрэгжээгүй.
  // Бодитоор байгаа зүйл нь админаар гараар хянагддаг профайл баталгаажуулалт.
  { Icon: UserCheck, titleKey: "trs.p2", descKey: "trs.p2d", cls: "text-neon border-neon/30 bg-neon/10" },
  { Icon: Scale, titleKey: "trs.p3", descKey: "trs.p3d", cls: "text-brand-soft border-brand/30 bg-brand/10" },
  // "AI fraud monitoring — fake briefs, cloned portfolios" гэсэн нь
  // хэрэгжээгүй. Бодитоор ажилладаг нь leakage.js: гэрээний өмнөх чатад
  // холбоо барих мэдээлэл илэрвэл тэмдэглэдэг.
  { Icon: MessageSquareWarning, titleKey: "trs.p4", descKey: "trs.p4d", cls: "text-brand-soft border-brand/30 bg-brand/10" },
  // "Encrypted in transit AND at rest" гэдэг нь at-rest шифрлэлт байхгүй
  // тул худал байв — байгаа зүйлээ л нэрлэе.
  { Icon: Lock, titleKey: "trs.p5", descKey: "trs.p5d", cls: "text-neon border-neon/30 bg-neon/10" },
  { Icon: Eye, titleKey: "trs.p6", descKey: "trs.p6d", cls: "text-mint border-mint/30 bg-mint/10" },
];

const ESCROW_STEPS = [
  { titleKey: "trs.e1", descKey: "trs.e1d" },
  { titleKey: "trs.e2", descKey: "trs.e2d" },
  { titleKey: "trs.e3", descKey: "trs.e3d" },
  { titleKey: "trs.e4", descKey: "trs.e4d" },
];

// Хугацааны шошгыг ("Within 24h", "Within 48h") хассан: Маргаан шийдвэрлэх
// журам нь тогтмол SLA хараахан баталгаажаагүй гэж тодорхой бичсэн байхад
// энэ хуудас цаг амлаж байсан — хоёр хуудас хоорондоо зөрчилдөж байв.
const DISPUTE_STEPS = [
  { Icon: AlertTriangle, titleKey: "trs.d1", timeKey: "trs.d1t", descKey: "trs.d1d" },
  { Icon: FileSearch, titleKey: "trs.d2", timeKey: "trs.d2t", descKey: "trs.d2d" },
  { Icon: Scale, titleKey: "trs.d3", timeKey: "trs.d3t", descKey: "trs.d3d" },
  { Icon: Check, titleKey: "trs.d4", timeKey: "trs.d4t", descKey: "trs.d4d" },
];

export default function TrustSafety() {
  const { nav } = useNav();
  const t = useT();

  return (
    <div className="mx-auto max-w-6xl px-6 pb-24 pt-36">
      <div className="text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-mint">
          {t("trs.eyebrow")}
        </p>
        <h1 className="mx-auto mt-4 max-w-2xl font-display text-[clamp(2.2rem,4.5vw,3.4rem)] font-bold leading-[1.05] tracking-tight">
          <BlurText text={t("trs.titleA")} />
          <span className="bg-gradient-to-r from-mint via-neon to-brand-soft bg-clip-text text-transparent">
            <BlurText text={t("trs.titleB")} delay={300} />
          </span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-white/55">
          {t("trs.intro")}
        </p>
      </div>

      {/* The #1 fear, solved */}
      <div className="mt-14 grid gap-5 md:grid-cols-2">
        <SpotlightCard spotColor="rgba(127, 168, 138, 0.14)">
          <div className="p-7">
            <span className="inline-flex items-center gap-2 rounded-full border border-mint/30 bg-mint/10 px-3.5 py-1.5 text-[10.5px] font-bold uppercase tracking-widest text-mint">
              {t("trs.flTag")}
            </span>
            <h3 className="mt-4 font-display text-xl font-bold">{t("trs.flQ")}</h3>
            <p className="mt-3 text-[13.5px] leading-relaxed text-white/60">
              {t("trs.flA1")}{" "}
              <span className="font-semibold text-mint">{t("trs.flBadge")}</span>{" "}
              {t("trs.flA2")}
            </p>
            <ul className="mt-5 space-y-2.5">
              {["trs.fl1", "trs.fl2", "trs.fl3"].map((key) => (
                <li key={key} className="flex items-start gap-2.5 text-[13px] text-white/70">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-mint" />
                  {t(key)}
                </li>
              ))}
            </ul>
          </div>
        </SpotlightCard>

        <SpotlightCard>
          <div className="p-7">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3.5 py-1.5 text-[10.5px] font-bold uppercase tracking-widest text-brand-soft">
              {t("trs.clTag")}
            </span>
            <h3 className="mt-4 font-display text-xl font-bold">{t("trs.clQ")}</h3>
            <p className="mt-3 text-[13.5px] leading-relaxed text-white/60">
              {t("trs.clA1")}{" "}
              <span className="font-semibold text-brand-soft">{t("trs.clRefund")}</span>{" "}
              {t("trs.clA2")}
            </p>
            <ul className="mt-5 space-y-2.5">
              {["trs.cl1", "trs.cl2", "trs.cl3"].map((key) => (
                <li key={key} className="flex items-start gap-2.5 text-[13px] text-white/70">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-soft" />
                  {t(key)}
                </li>
              ))}
            </ul>
          </div>
        </SpotlightCard>
      </div>

      {/* How escrow works */}
      <div className="mt-16">
        <h2 className="text-center font-display text-2xl font-bold tracking-tight">
          {t("trs.escrowTitle")}
        </h2>
        <div className="glass mt-8 rounded-2xl p-7">
          <div className="grid gap-6 md:grid-cols-4">
            {ESCROW_STEPS.map(({ titleKey, descKey }, i) => (
              <div key={titleKey} className="relative">
                <span
                  className={
                    i === 0
                      ? "flex h-10 w-10 items-center justify-center rounded-full bg-mint font-display text-[14px] font-bold text-ink"
                      : "flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] font-display text-[14px] font-bold text-white/60"
                  }
                >
                  {i + 1}
                </span>
                <p className="mt-3.5 text-[14px] font-semibold">{t(titleKey)}</p>
                <p className="mt-1 text-[12px] leading-relaxed text-white/45">{t(descKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Protection grid */}
      <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PROTECTIONS.map(({ Icon, titleKey, descKey, cls }) => (
          <SpotlightCard key={titleKey}>
            <div className="p-6">
              <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border ${cls}`}>
                <Icon className="h-4.5 w-4.5" />
              </span>
              <p className="mt-4 text-[14.5px] font-semibold">{t(titleKey)}</p>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-white/50">{t(descKey)}</p>
            </div>
          </SpotlightCard>
        ))}
      </div>

      {/* Dispute timeline */}
      <div className="mt-16">
        <h2 className="text-center font-display text-2xl font-bold tracking-tight">
          {t("trs.dTitle")}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-center text-[13px] text-white/45">
          {t("trs.dIntro")}
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-4">
          {DISPUTE_STEPS.map(({ Icon, titleKey, timeKey, descKey }) => (
            <div key={titleKey} className="glass rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-neon/30 bg-neon/10 text-neon">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-white/35">
                  <Clock className="h-3 w-3" />
                  {t(timeKey)}
                </span>
              </div>
              <p className="mt-4 text-[13.5px] font-semibold">{t(titleKey)}</p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-white/45">{t(descKey)}</p>
            </div>
          ))}
        </div>
        {/* Хугацааны хүлээлтийг журамтайгаа яг таарсан үгээр хэлнэ. */}
        <button
          onClick={() => nav("dispute-policy")}
          className="mx-auto mt-6 block max-w-2xl rounded-2xl border border-white/8 bg-white/[0.02] px-5 py-4 text-center text-[12.5px] leading-relaxed text-white/45 transition-colors hover:border-white/20 hover:text-white/65"
        >
          {t("trs.slaNote")}
        </button>
      </div>

      {/* CTA */}
      <div className="glass mt-16 rounded-3xl p-10 text-center">
        <ShieldCheck className="mx-auto h-10 w-10 text-mint" />
        <h2 className="mt-4 font-display text-2xl font-bold tracking-tight">
          {t("trs.ctaTitle")}
        </h2>
        {/* Өмнө нь "Join 12,000+ freelancers and thousands of teams" гэж
            бичсэн байв — платформ дээр бодитоор хэдэн арван хэрэглэгч
            байхад. Тоо зарлахгүй: амлалтаа хэлье, тоог биш. */}
        <p className="mx-auto mt-2 max-w-md text-[13.5px] text-white/50">
          {t("trs.ctaDesc")}
        </p>
        <Magnet strength={0.15} className="mt-6">
          <button
            onClick={() => nav("auth")}
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-mint to-emerald-400 px-8 py-3.5 text-[14px] font-bold text-ink glow-mint transition-shadow"
          >
            {t("trs.ctaBtn")}
            <ArrowRight className="h-4 w-4" />
          </button>
        </Magnet>
      </div>
    </div>
  );
}
