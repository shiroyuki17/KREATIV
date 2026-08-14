import { useMemo, useState } from "react";
import { Search, ChevronDown, Rocket, Wallet, User, ShieldCheck, Briefcase, LifeBuoy, MessageSquare } from "lucide-react";
import BlurText from "../fx/BlurText.jsx";
import { useNav } from "../../nav.jsx";
import { useI18n } from "../../i18n.jsx";

// Сэдвийн хайрцаг бүр дээр "12 articles", "18 articles" гэсэн тоо
// байсан — нийтдээ 7 асуулт байхад. Нэг ч нийтлэл байхгүй тул тоог
// хассан: эдгээр нь хайлтын товчлол болж ажилладаг.
// Хайлт нь харагдаж буй бичвэр дээр ажилладаг тул товчлолын үг ч хэл
// тус бүрд өөр байх ёстой.
const TOPICS = [
  { Icon: Rocket, labelKey: "hc.t1", q: { mn: "эхл", en: "start" } },
  { Icon: Wallet, labelKey: "hc.t2", q: { mn: "escrow", en: "escrow" } },
  { Icon: User, labelKey: "hc.t3", q: { mn: "профайл", en: "profile" } },
  { Icon: ShieldCheck, labelKey: "hc.t4", q: { mn: "маргаан", en: "dispute" } },
  { Icon: Briefcase, labelKey: "hc.t5", q: { mn: "захиалагч", en: "client" } },
  { Icon: LifeBuoy, labelKey: "hc.t6", q: { mn: "фрилансер", en: "freelancer" } },
];

const FAQ = [
  { qKey: "hc.q1", aKey: "hc.a1" },
  // Үнийг энд хатуу бичихээ больсон: "Pro is $29/mo" гэж бичигдсэн байсан
  // бөгөөд Stripe дээрх бодит үнэ $29.99. Шимтгэлийн хувь нь plans.js-д
  // тогтмол тул тэрийг хэлээд, үнийн талаар Багц хуудас руу чиглүүлнэ.
  { qKey: "hc.q2", aKey: "hc.a2" },
  // "the platform average is about 3.2 hours" гэсэн тоо ямар ч
  // хэмжилтэд тулгуурладаггүй байв.
  { qKey: "hc.q3", aKey: "hc.a3" },
  { qKey: "hc.q4", aKey: "hc.a4" },
  { qKey: "hc.q5", aKey: "hc.a5" },
  // "Payouts typically arrive within 1–2 business days" гэдэг нь
  // PENDING_HOLD_DAYS = 5 хоногийн маргааны цонхыг огт дурдаагүй байв.
  { qKey: "hc.q6", aKey: "hc.a6" },
  { qKey: "hc.q7", aKey: "hc.a7" },
];

function Accordion({ item, open, onToggle, t }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] transition-colors hover:border-white/15">
      <button onClick={onToggle} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left">
        <span className="text-[14px] font-semibold">{t(item.qKey)}</span>
        <ChevronDown className={`h-4.5 w-4.5 shrink-0 text-white/40 transition-transform ${open ? "rotate-180 text-brand-soft" : ""}`} />
      </button>
      {open && <p className="animate-feed-in px-5 pb-5 text-[13.5px] leading-relaxed text-white/55">{t(item.aKey)}</p>}
    </div>
  );
}

export default function HelpCenter() {
  const { nav } = useNav();
  const { t, locale } = useI18n();
  const [q, setQ] = useState("");
  const [openIdx, setOpenIdx] = useState(0);

  // Хайлт нь ОРЧУУЛСАН бичвэр дээр ажиллана — хэрэглэгч харж байгаа үгээрээ
  // хайх ёстой.
  const results = useMemo(
    () =>
      FAQ.filter(
        (f) =>
          q.trim() === "" ||
          (t(f.qKey) + t(f.aKey)).toLowerCase().includes(q.toLowerCase())
      ),
    [q, t]
  );

  return (
    <div className="mx-auto max-w-5xl px-6 pb-24 pt-36">
      <div className="text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-soft">{t("hc.eyebrow")}</p>
        <h1 className="mt-4 font-display text-[clamp(2rem,4vw,3rem)] font-bold text-brand text-glow tracking-tight">
          <BlurText text={t("hc.title")} />
        </h1>
        <div className="mx-auto mt-7 flex max-w-xl items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 focus-within:border-brand/50">
          <Search className="h-5 w-5 shrink-0 text-white/40" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("hc.search")}
            className="w-full bg-transparent text-[14px] outline-none placeholder:text-white/30"
          />
        </div>
      </div>

      {q.trim() === "" && (
        <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-3">
          {TOPICS.map(({ Icon, labelKey, q: topicQuery }) => (
            <button
              key={labelKey}
              onClick={() => setQ(topicQuery[locale] || topicQuery.en)}
              className="glass rounded-2xl p-5 text-left transition-all hover:border-brand/40 hover:-translate-y-0.5"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-brand/30 bg-brand/10 text-brand-soft">
                <Icon className="h-4.5 w-4.5" />
              </span>
              <p className="mt-4 text-[14px] font-semibold">{t(labelKey)}</p>
            </button>
          ))}
        </div>
      )}

      <div className="mt-12">
        <h2 className="mb-4 font-display text-lg font-bold">
          {q.trim() === "" ? t("hc.popular") : t("hc.results", { count: results.length })}
        </h2>
        <div className="space-y-2.5">
          {results.map((item, i) => (
            <Accordion key={item.qKey} item={item} open={openIdx === i} onToggle={() => setOpenIdx(openIdx === i ? -1 : i)} t={t} />
          ))}
          {results.length === 0 && (
            <p className="rounded-2xl border border-white/8 bg-white/[0.02] p-8 text-center text-[13.5px] text-white/45">
              {t("hc.noResults", { q })}
            </p>
          )}
        </div>
      </div>

      <div className="glass mt-10 flex flex-col items-center gap-3 rounded-3xl p-8 text-center">
        <MessageSquare className="h-8 w-8 text-brand-soft" />
        <h2 className="font-display text-xl font-bold">{t("hc.stillTitle")}</h2>
        {/* "Our team replies within a few hours — every day of the week"
            гэсэн амлалт ямар ч ажиллах цагийн журамд тулгуурладаггүй байв. */}
        <p className="max-w-sm text-[13px] text-white/50">{t("hc.stillDesc")}</p>
        <button onClick={() => nav("contact")} className="mt-2 rounded-xl bg-brand px-6 py-3 text-[13.5px] font-bold text-fg-1 glow-brand">
          {t("hc.contact")}
        </button>
      </div>
    </div>
  );
}
