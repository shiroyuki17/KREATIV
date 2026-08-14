import { useEffect, useState } from "react";
import { Sparkles, Code2, Palette, Megaphone, PenTool, Film } from "lucide-react";
import SpotlightCard from "../fx/SpotlightCard.jsx";
import BlurText from "../fx/BlurText.jsx";
import { useNav } from "../../nav.jsx";
import { useT } from "../../i18n.jsx";
import { fetchPublicStats } from "../../lib/analyticsApi.js";

// Өмнө нь энэ хэсэг src/data/mock.js-ийн 10 зохиомол категорийг ("AI Services
// — 480 experts", "Development & IT — 3,200 experts" г.м) харуулдаг байв.
// Тэдгээр нэр нь системд байдаггүй, тоо нь ямар ч өгөгдөлд тулгуурладаггүй,
// дээр нь дарахад бодит үр дүн гардаггүй байсан.
//
// Одоо системийн ЖИНХЭНЭ 6 категори (job.schema.js-ийн CATEGORIES) болон
// /analytics/public-ийн бодит мэргэжилтний тоог харуулна.
// `key` нь backend-ийн категори — ХЭЗЭЭ Ч орчуулагдахгүй (шүүлтэнд очдог).
// Зөвхөн labelKey нь хэлээр солигдоно.
const CATEGORY_META = [
  { key: "Design", labelKey: "home.catDesign", Icon: Palette },
  { key: "Dev", labelKey: "home.catDev", Icon: Code2 },
  { key: "AI", labelKey: "home.catAI", Icon: Sparkles },
  { key: "Motion", labelKey: "home.catMotion", Icon: Film },
  { key: "Writing", labelKey: "home.catWriting", Icon: PenTool },
  { key: "Marketing", labelKey: "home.catMarketing", Icon: Megaphone },
];

export default function Categories() {
  const { nav } = useNav();
  const t = useT();
  const [counts, setCounts] = useState(null);
  // Категорийн нэрийг биш, ЯГ түүний түлхүүрийг дамжуулна — FindTalent
  // үүгээр бодитоор шүүнэ (өмнө нь "AI Services" гэсэн мөрийг хайдаг байсан
  // тул үргэлж хоосон буцаадаг байв).
  const goCat = (key) => nav("find-talent", { category: key });

  useEffect(() => {
    let cancelled = false;
    fetchPublicStats()
      .then((s) => { if (!cancelled) setCounts(s.byCategory || {}); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return (
    <section id="categories" className="relative py-12 md:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-soft">
          {t("home.browseCategories")}
        </p>
        <h2 className="mt-3 font-display text-[clamp(1.9rem,3.6vw,2.8rem)] font-bold text-brand text-glow tracking-tight">
          <BlurText text={t("home.findBySkill")} />
        </h2>

        {/* 6 категори — 2 / 3 хоёулаа тэгш хуваадаг тул аль ч өргөнд
            эгнээ дүүрэн байна. */}
        <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3">
          {CATEGORY_META.map(({ key, labelKey, Icon }, i) => {
            const colors = [
              "border-brand/30 bg-brand/10 text-brand-soft group-hover:bg-brand group-hover:text-ink glow-brand",
              "border-neon/30 bg-neon/10 text-neon group-hover:bg-neon group-hover:text-ink glow-mint",
              "border-violet/30 bg-violet/10 text-violet-soft group-hover:bg-violet group-hover:text-white glow-violet",
              "border-mint/30 bg-mint/10 text-mint group-hover:bg-mint group-hover:text-ink glow-mint",
              "border-amber-400/30 bg-amber-400/10 text-amber-300 group-hover:bg-amber-400 group-hover:text-ink",
            ];
            const colorClass = colors[i % colors.length];
            return (
              <SpotlightCard
                key={key}
                onClick={() => goCat(key)}
                style={{ animationDelay: `${i * 50}ms` }}
                className="glass-card-neon group animate-rise-in cursor-pointer transition-all duration-300 hover:-translate-y-1.5"
              >
                <div className="p-6">
                  <span className={`flex h-12 w-12 items-center justify-center rounded-2xl border transition-all duration-300 ${colorClass}`}>
                    <Icon className="h-6 w-6" />
                  </span>
                  <p className="mt-5 text-[15px] font-bold leading-snug text-white group-hover:text-brand-soft transition-colors">{t(labelKey)}</p>
                  {/* Тоо ирэх хүртэл юу ч бичихгүй — зохиомол тоо түр
                      харуулаад дараа нь солих нь худал мэдээлэл өгсөнтэй адил. */}
                  <p className="mt-1 text-[11.5px] font-medium text-white/40">
                    {counts == null
                      ? " "
                      : t("home.expertCount", { count: (counts[key] || 0).toLocaleString("en-US") })}
                  </p>
                </div>
              </SpotlightCard>
            );
          })}
        </div>
      </div>
    </section>
  );
}
