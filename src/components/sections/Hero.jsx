import { useEffect, useState } from "react";
import { Clock, BadgeCheck, ArrowRight } from "lucide-react";
import { DUR, stagger, timeline, useMotion } from "../../lib/motion.js";
import SplitText from "../fx/SplitText.jsx";
import BlurText from "../fx/BlurText.jsx";
import TiltedCard from "../fx/TiltedCard.jsx";
import CountUp from "../fx/CountUp.jsx";
import AmbientOrb from "../fx/AmbientOrb.jsx";
import { TAGS } from "../../data/mock.js";
import { useNav } from "../../nav.jsx";
import { fetchPublicStats } from "../../lib/analyticsApi.js";

// Hero-гийн статистик өмнө нь src/data/mock.js-д hardcode байсан:
// "12,400 vetted freelancers", "48,000 projects delivered", "$32M paid out",
// "3.2 hrs avg. match time". Нэг ч тоо бодит өгөгдөлд тулгуурладаггүй байв.
// Одоо /analytics/public-аас ирнэ. "Avg. match time"-ыг хассан — түүнийг
// тооцох өгөгдөл системд огт байхгүй тул зохиохоос татгалзав.
function buildStats(s) {
  if (!s) return [];
  return [
    { label: "Vetted freelancers", value: s.freelancers, suffix: "+" },
    { label: "Projects delivered", value: s.completedJobs, suffix: "+" },
    { label: "Open briefs", value: s.openJobs, suffix: "" },
    // Escrow-оос БОДИТООР гарсан дүн. Сая болгож бөөрөнхийлөхийн оронд
    // бодит хэмжээнд нь тохируулж форматлана — эс тэгвээс жижиг дүн бүр
    // "$0M" болж утгагүй харагдана.
    { label: "Paid out securely", value: s.paidOut, prefix: "$", money: true },
  ];
}

// 1_250_000 -> 1.25M, 32_000 -> 32K, 940 -> 940
function moneyParts(amount) {
  if (amount >= 1_000_000) return { to: amount / 1_000_000, suffix: "M", decimals: 1 };
  if (amount >= 1_000) return { to: amount / 1_000, suffix: "K", decimals: 0 };
  return { to: amount, suffix: "", decimals: 0 };
}

function MiniStepper() {
  return (
    <div className="flex items-center gap-1.5">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex flex-1 items-center gap-1.5">
          <span
            className={
              i < 2
                ? "h-2.5 w-2.5 rounded-full bg-brand-soft shadow-[0_0_10px_rgba(52,227,173,0.8)]"
                : i === 2
                  ? "h-2.5 w-2.5 animate-pulse-soft rounded-full bg-neon"
                  : "h-2.5 w-2.5 rounded-full bg-white/15"
            }
          />
          {i < 3 && (
            <span
              className={`h-px flex-1 ${i < 2 ? "bg-brand-soft/60" : "bg-white/10"}`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function DashboardPreview() {
  return (
    <TiltedCard className="relative animate-float">
      <div className="glass w-full max-w-md rounded-2xl p-5 glow-brand">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-display text-[15px] font-semibold">
              Checkout flow revamp
            </p>
            <p className="mt-0.5 text-[11px] text-white/45">
              Nova Studio · Milestone 2 of 4
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-neon/30 bg-neon/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-neon">
            <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-neon" />
            In progress
          </span>
        </div>

        <div className="mt-5">
          <MiniStepper />
        </div>

        <div className="mt-5 rounded-xl border border-white/8 bg-white/[0.03] p-3">
          <div className="flex items-center justify-between text-[11px] text-white/50">
            <span>Phase 1 · Development</span>
            <span className="font-semibold text-white/80">68%</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/8">
            <div
              className="h-full rounded-full bg-brand"
              style={{ width: "68%" }}
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-[11px] text-white/50">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-brand-soft" />
            42.5h logged / 60h est.
          </span>
          <span className="inline-flex items-center gap-1.5">
            <BadgeCheck className="h-3.5 w-3.5 text-mint" />
            Escrow funded
          </span>
        </div>
      </div>

      <div className="glass absolute -right-4 -top-5 animate-float-slow rounded-xl px-3.5 py-2.5 text-[11px] font-semibold text-mint glow-mint">
        +$2,400 released
      </div>
      <div className="glass absolute -bottom-5 -left-4 animate-float-slow rounded-xl px-3.5 py-2.5 text-[11px] font-semibold text-brand-soft [animation-delay:1.4s]">
        98% AI match
      </div>
    </TiltedCard>
  );
}

export default function Hero() {
  const { nav } = useNav();
  const [query, setQuery] = useState("");
  const [stats, setStats] = useState([]);
  const searchTalent = (val) =>
    nav("find-talent", val && val.trim() ? { query: val } : null);

  // Тоо ирэх хүртэл хайрцгуудыг огт харуулахгүй — 12,400 гэх мэт зохиомол
  // тоог урьдчилж тавиад дараа нь бодит тоо руу үсрэх нь хамгийн муу
  // хувилбар.
  useEffect(() => {
    let cancelled = false;
    fetchPublicStats()
      .then((s) => { if (!cancelled) setStats(buildStats(s)); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Өмнө нь hero-гийн хэсэг бүр (SplitText, BlurText, CountUp) тус тусдаа
  // IntersectionObserver-тэй, өөр өөрийн цагаар асдаг байсан тул нийтдээ
  // "зэрэг бөөндөө" гарч ирдэг байв. Одоо нэг timeline эдгээрийн хооронд
  // байрлаж, гарчиг → тайлбар → хайлт → шошго → товч гэсэн дараалал үүсгэнэ.
  // (SplitText/BlurText өөрсдийн дотоод stagger-аа хэвээр хөтөлнө — энд зөвхөн
  // өмнө нь ямар ч хөдөлгөөнгүй байсан элементүүдийг зохион байгуулна.)
  const heroRef = useMotion(() => {
    timeline()
      .add(".hero-badge", { opacity: [0, 1], y: [-10, 0], duration: DUR.base }, 0)
      .add(".hero-preview", { opacity: [0, 1], x: [28, 0], duration: DUR.ambient }, 250)
      .add(".hero-search", { opacity: [0, 1], y: [18, 0], duration: DUR.slow }, 620)
      .add(
        ".hero-tag",
        { opacity: [0, 1], y: [8, 0], duration: DUR.base, delay: stagger(45) },
        780
      )
      .add(
        ".hero-cta",
        { opacity: [0, 1], y: [14, 0], duration: DUR.slow, delay: stagger(90) },
        900
      );
    // ⚠️ ".hero-stat" энэ timeline-д ОРОХГҮЙ. Тэдгээр нь /analytics/public
    // ирсэн ХОЙНО mount хийгддэг тул timeline ажиллах үед DOM-д байхгүй —
    // өмнө нь inline `opacity: 0`-тэй хэвээр үлдэж, статистик бүрмөсөн
    // үл үзэгдэх болсон. Одоо CSS-ийн animate-rise-in-ээр өөрсдөө гарна.
  }, []);

  return (
    <section
      ref={heroRef}
      id="top"
      className="relative overflow-hidden pb-20 pt-36 md:pb-28 md:pt-44"
    >
      {/* Background Animated Glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 h-[700px] w-[1100px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-brand/35 via-neon/25 to-violet/20 blur-[150px] animate-pulse-slow"
      />

      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          {/* Badge */}
          <div
            style={{ opacity: 0 }}
            className="hero-badge inline-flex items-center gap-2 rounded-full border border-brand/40 bg-brand/10 px-4 py-1.5"
          >
            <span className="h-2 w-2 rounded-full bg-brand animate-pulse" />
            <span className="text-[11.5px] font-bold uppercase tracking-widest text-brand-soft">Next-Gen Freelance Network</span>
          </div>

          {/* Massive Heading */}
          <h1 className="mt-5 font-display text-[clamp(2.8rem,6vw,4.8rem)] font-bold leading-[1.02] tracking-tight text-white">
            <SplitText text="Elite work meets" />
            <br />
            <span className="bg-gradient-to-r from-brand-soft via-neon to-mint bg-clip-text font-bold text-transparent">
              elite talent.
            </span>
          </h1>

          <p className="mt-6 max-w-lg text-[16px] leading-relaxed text-white/70">
            <BlurText
              text="Post a brief, get AI-matched in hours, and track every milestone in real time — with escrow-protected payments."
              stagger={22}
            />
          </p>

          {/* Search Box - Cyber Floating Bar */}
          <div
            style={{ opacity: 0 }}
            className="hero-search relative mt-9 max-w-lg rounded-2xl border border-white/15 bg-white/[0.04] p-2 shadow-[0_8px_32px_rgba(0,0,0,0.5)] transition-all focus-within:border-brand/60"
          >
            <div className="flex items-center gap-2 pl-3">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchTalent(query)}
                placeholder='Try "3D landing page" or "React developer"'
                className="w-full bg-transparent text-[14.5px] text-white outline-none placeholder:text-white/35"
              />
              <button
                onClick={() => searchTalent(query)}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-brand px-5 py-3 text-[13.5px] font-bold text-ink glow-brand transition-all hover:scale-105"
              >
                Search
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Quick tags */}
          <div className="mt-5 flex flex-wrap items-center gap-2 text-[12px] text-white/50">
            <span className="font-medium">Popular:</span>
            {TAGS.slice(0, 4).map((t) => (
              <button
                key={t}
                onClick={() => searchTalent(t)}
                style={{ opacity: 0 }}
                className="hero-tag rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 transition-all hover:border-brand/40 hover:bg-brand/10 hover:text-brand-soft"
              >
                {t}
              </button>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <button
              onClick={() => nav("find-talent")}
              style={{ opacity: 0 }}
              className="hero-cta rounded-2xl bg-brand px-7 py-3.5 text-[14px] font-semibold text-ink glow-brand transition-all duration-200 hover:scale-[1.03]"
            >
              Find Talent
            </button>
            <button
              onClick={() => nav("post-job")}
              style={{ opacity: 0 }}
              className="hero-cta glass rounded-2xl px-7 py-3.5 text-[14px] font-semibold text-white/85 transition-all duration-200 hover:scale-[1.03] hover:border-white/25"
            >
              Post a Job
            </button>
          </div>
        </div>

        <div className="relative hidden justify-center lg:flex">
          <div className="pointer-events-none absolute -right-16 top-1/2 -z-10 -translate-y-1/2 opacity-80">
            <AmbientOrb size={420} />
          </div>
          {/* TiltedCard дотроо inline transform бичдэг тул хөдөлгөөнийг гадна
              талын wrapper дээр хийнэ — эс тэгвэл хоёулаа transform дээр
              зөрчилдөнө. */}
          <div style={{ opacity: 0 }} className="hero-preview">
            <DashboardPreview />
          </div>
        </div>
      </div>

      <div className="relative mx-auto mt-20 grid max-w-6xl grid-cols-2 gap-6 border-t border-white/8 px-6 pt-10 md:grid-cols-4">
        {stats.map((s, i) => {
          const m = s.money ? moneyParts(s.value) : null;
          return (
            <div
              key={s.label}
              style={{ animationDelay: `${i * 70}ms` }}
              className="hero-stat animate-rise-in"
            >
              <p className="font-display text-3xl font-bold">
                <CountUp
                  to={m ? m.to : s.value}
                  prefix={s.prefix || ""}
                  suffix={m ? m.suffix : s.suffix || ""}
                  decimals={m ? m.decimals : s.decimals || 0}
                />
              </p>
              <p className="mt-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-white/40">
                {s.label}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
