import { useEffect, useState } from "react";
import Avatar from "../ui/Avatar.jsx";
import { Star, Quote, ArrowRight, AlertCircle } from "lucide-react";
import BlurText from "../fx/BlurText.jsx";
import SpotlightCard from "../fx/SpotlightCard.jsx";
import CountUp from "../fx/CountUp.jsx";
import { useNav } from "../../nav.jsx";
import { fetchPublicReviews } from "../../lib/contractApi.js";

// Энэ хуудас өмнө нь appMock.js-ийн зохиомол сэтгэгдэл, мөн hardcode хийсэн
// "4.9 · 48,000+ төсөл · 98% дахин ажилладаг · 99.2% маргаан шударга
// шийдэгдсэн" гэсэн тоог харуулдаг байв. Нэг ч тоо нь бодит өгөгдөлд
// тулгуурладаггүй байсан — өөрөөр хэлбэл платформ хэрэглэгчиддээ худал
// статистик зарлаж байсан. Одоо бүгд /reviews/public-аас ирнэ; өгөгдөл
// байхгүй бол тоог гоёчлохгүй, шууд "хараахан үнэлгээ алга" гэж хэлнэ.

const FILTERS = ["All", "Clients", "Freelancers"];

function initialsOf(name) {
  return (name || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

function Stars({ value, className = "h-3.5 w-3.5" }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`${className} ${i < Math.round(value) ? "fill-amber-400 text-amber-400" : "text-white/15"}`}
        />
      ))}
    </div>
  );
}

export default function Reviews() {
  const { nav } = useNav();
  const [filter, setFilter] = useState("All");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchPublicReviews()
      .then((res) => { if (!cancelled) setData(res); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const reviews = data?.reviews || [];
  const stats = data?.stats;
  const featured = reviews[0] || null;

  const list = reviews.filter((r) =>
    filter === "All" ? true : filter === "Clients" ? r.authorSide === "client" : r.authorSide === "freelancer"
  );

  // Бодит тоо байхад л статистикийн хайрцгийг харуулна. `averageRating` нь
  // үнэлгээ огт байхгүй үед null ирдэг тул 0.0 гэж будлиантай харуулахгүй.
  const STAT_TILES = stats
    ? [
        stats.averageRating != null && {
          value: stats.averageRating, decimals: 1, label: "Average rating",
        },
        { value: stats.totalReviews, label: "Reviews written" },
        { value: stats.completedContracts, label: "Contracts completed" },
      ].filter(Boolean)
    : [];

  return (
    <div className="mx-auto max-w-6xl px-6 pb-24 pt-36">
      <div className="text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-soft">— Success stories</p>
        <h1 className="mx-auto mt-4 max-w-2xl font-display text-[clamp(2.2rem,4.5vw,3.4rem)] font-bold text-brand text-glow leading-[1.05] tracking-tight">
          <BlurText text="Great work, fairly paid." />
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-white/55">
          Every review below comes from a completed KREATIV contract — nothing is written by us.
        </p>
      </div>

      {loading && (
        <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse-soft h-24 rounded-2xl bg-white/[0.06]" />
          ))}
        </div>
      )}

      {error && (
        <div className="mt-12 flex items-center justify-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/5 p-5 text-[13px] text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {!loading && !error && STAT_TILES.length > 0 && (
        <div className={`mt-12 grid gap-4 ${STAT_TILES.length === 3 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-2"}`}>
          {STAT_TILES.map((s) => (
            <div key={s.label} className="glass rounded-2xl p-5 text-center">
              <p className="font-display text-3xl font-bold text-brand">
                <CountUp to={s.value} decimals={s.decimals || 0} />
              </p>
              <p className="mt-1.5 text-[10.5px] font-medium uppercase tracking-wider text-white/40">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && reviews.length === 0 && (
        <div className="glass mt-12 rounded-3xl p-12 text-center">
          <Quote className="mx-auto h-10 w-10 text-brand/25" />
          <h2 className="mt-4 font-display text-xl font-bold">No reviews yet</h2>
          <p className="mx-auto mt-2 max-w-md text-[13.5px] leading-relaxed text-white/50">
            Reviews appear here once contracts are completed and both sides have rated
            each other. Be the first to ship something.
          </p>
          <button
            onClick={() => nav("auth")}
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-brand px-6 py-3 text-[13.5px] font-semibold text-ink glow-brand"
          >
            Get started free <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {featured && (
        <div className="glass mt-6 overflow-hidden rounded-3xl">
          <div className="relative p-8 md:p-12">
            <Quote className="absolute right-8 top-8 h-16 w-16 text-brand/10" />
            <Stars value={featured.stars} className="h-5 w-5" />
            <p className="mt-5 max-w-3xl font-display text-[clamp(1.3rem,2.4vw,1.9rem)] font-semibold leading-snug">
              “{featured.comment}”
            </p>
            <div className="mt-7 flex items-center gap-3">
              <Avatar name={featured.reviewerName} seed={featured.id} size="h-12 w-12 text-[31px]" />
              <div>
                <p className="text-[15px] font-semibold">{featured.reviewerName}</p>
                <p className="text-[12.5px] text-white/45">
                  {featured.authorSide === "client" ? "Client" : "Freelancer"}
                  {featured.jobTitle ? ` · ${featured.jobTitle}` : ""}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {reviews.length > 0 && (
        <>
          <div className="mt-10 flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={filter === f
                  ? "rounded-full bg-brand px-4 py-2 text-[12px] font-semibold text-ink glow-brand"
                  : "rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-[12px] font-medium text-white/55 transition-colors hover:border-brand/40 hover:text-white"}
              >
                {f}
              </button>
            ))}
          </div>

          {list.length === 0 ? (
            <p className="mt-6 text-[13.5px] text-white/45">No reviews in this category yet.</p>
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {list.map((r) => (
                <SpotlightCard key={r.id}>
                  <div className="flex h-full flex-col p-6">
                    <div className="flex items-center justify-between">
                      <Stars value={r.stars} />
                      {r.jobTitle && (
                        <span className="max-w-[55%] truncate rounded-full border border-brand/25 bg-brand/8 px-2.5 py-1 text-[10px] font-bold text-brand-soft">
                          {r.jobTitle}
                        </span>
                      )}
                    </div>
                    <p className="mt-3.5 flex-1 text-[13.5px] leading-relaxed text-white/70">“{r.comment}”</p>
                    <div className="mt-5 flex items-center gap-3 border-t border-white/8 pt-4">
                      <Avatar name={r.reviewerName} seed={r.id} size="h-9 w-9 text-[23px]" />
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold">{r.reviewerName}</p>
                        <p className="truncate text-[11px] text-white/40">
                          {r.authorSide === "client" ? "Client" : "Freelancer"}
                        </p>
                      </div>
                    </div>
                  </div>
                </SpotlightCard>
              ))}
            </div>
          )}
        </>
      )}

      <div className="mt-14 flex flex-col items-center gap-4 text-center">
        <h2 className="font-display text-2xl font-bold tracking-tight">Join them</h2>
        <div className="flex flex-wrap justify-center gap-3">
          <button onClick={() => nav("auth")} className="inline-flex items-center gap-2 rounded-2xl bg-brand px-7 py-3.5 text-[14px] font-semibold text-ink glow-brand transition-shadow">
            Get started free <ArrowRight className="h-4 w-4" />
          </button>
          <button onClick={() => nav("how")} className="glass rounded-2xl px-7 py-3.5 text-[14px] font-semibold text-white/85 transition-colors hover:border-white/25">
            How it works
          </button>
        </div>
      </div>
    </div>
  );
}
