import { useEffect, useState } from "react";
import { Search, Star, SlidersHorizontal, ChevronLeft, ChevronRight, AlertCircle, BadgeCheck, Clock, ImageIcon } from "lucide-react";
import { useNav } from "../../nav.jsx";
import { avatarSrc } from "../../lib/authApi.js";
import { fetchGigs } from "../../lib/gigApi.js";
import { CardGridSkeleton } from "../ui/Skeleton.jsx";

const CATS = ["All", "Design", "Dev", "AI", "Motion", "Writing", "Marketing"];
const SORTS = {
  relevant: "Most relevant",
  newest: "Newest",
  priceLow: "Price: low to high",
  priceHigh: "Price: high to low",
};

function initialsOf(name) {
  return (name || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

function GigCard({ g, nav, i = 0 }) {
  return (
    <button
      onClick={() => nav("gig", { id: g.id })}
      style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}
      className="glass group animate-rise-in overflow-hidden rounded-2xl text-left transition-transform duration-300 hover:-translate-y-0.5 hover:scale-[1.015]"
    >
      {g.images?.[0] ? (
        <img src={avatarSrc(g.images[0])} alt="" className="h-40 w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]" />
      ) : (
        <div className="flex h-40 w-full items-center justify-center bg-white/[0.02] text-white/15">
          <ImageIcon className="h-9 w-9" />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand text-[9px] font-bold">
            {g.freelancer.avatarUrl ? (
              <img src={avatarSrc(g.freelancer.avatarUrl)} alt="" className="h-full w-full object-cover" />
            ) : (
              initialsOf(g.freelancer.name)
            )}
          </span>
          <span className="truncate text-[12px] font-medium text-white/60">{g.freelancer.name}</span>
          {g.freelancer.verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-neon" />}
        </div>
        <p className="mt-2.5 line-clamp-2 text-[13.5px] font-semibold leading-snug">{g.title}</p>
        <div className="mt-3 flex items-center justify-between border-t border-white/8 pt-3">
          <span className="flex items-center gap-1 text-[11px] text-white/40">
            <Clock className="h-3.5 w-3.5" /> {g.deliveryDays}d delivery
          </span>
          {g.reviewCount > 0 ? (
            <span className="flex items-center gap-1 text-[11px] font-bold text-amber-400">
              <Star className="h-3 w-3 fill-amber-400" /> {g.ratingAvg.toFixed(1)} ({g.reviewCount})
            </span>
          ) : g.freelancer.ratingAvg > 0 ? (
            <span className="flex items-center gap-1 text-[11px] font-bold text-amber-400">
              <Star className="h-3 w-3 fill-amber-400" /> {g.freelancer.ratingAvg.toFixed(1)}
            </span>
          ) : null}
        </div>
        <div className="mt-1.5 flex items-center justify-between">
          {g.ordersCount > 0 ? (
            <span className="text-[10.5px] text-white/35">{g.ordersCount} захиалагдсан</span>
          ) : <span />}
        </div>
        <p className="mt-1.5 text-right font-display text-[16px] font-bold text-mint">${g.price}</p>
      </div>
    </button>
  );
}

export default function FindServices() {
  const { params, nav } = useNav();
  const [q, setQ] = useState(params?.query || "");
  const [cat, setCat] = useState(params?.category || "All");
  const [sort, setSort] = useState("relevant");
  const [page, setPage] = useState(1);

  const [gigs, setGigs] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetchGigs({
          q: q.trim() || undefined,
          category: cat !== "All" ? cat : undefined,
          sort,
          page,
          pageSize: 12,
        });
        setGigs(res.gigs);
        setTotal(res.total);
        setTotalPages(res.totalPages);
      } catch (err) {
        setError(err.message);
        setGigs([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q, cat, sort, page]);

  return (
    <div className="mx-auto max-w-[1400px] px-6 pb-24 pt-8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-soft">
        — Browse services
      </p>
      <h1 className="mt-3 font-display text-[clamp(1.9rem,3.6vw,2.8rem)] font-bold text-brand text-glow tracking-tight">
        Bэлэн үйлчилгээ захиалах
      </h1>
      <p className="mt-2 max-w-xl text-[13.5px] text-white/50">
        Fixed-price — үнэ, хугацаа урьдчилж тодорхой. Захиалаад л, freelancer шууд эхэлнэ.
      </p>

      <div className="mt-7 flex flex-wrap items-center gap-3">
        <div className="flex min-w-[240px] flex-1 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 focus-within:border-brand/50">
          <Search className="h-4.5 w-4.5 shrink-0 text-white/40" />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            placeholder="Search services…"
            className="w-full bg-transparent text-[14px] outline-none placeholder:text-white/30"
          />
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
          <SlidersHorizontal className="h-4 w-4 text-white/40" />
          <select
            value={sort}
            onChange={(e) => { setSort(e.target.value); setPage(1); }}
            className="bg-transparent text-[13px] text-white/75 outline-none [&>option]:bg-[#14141a]"
          >
            {Object.entries(SORTS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {CATS.map((c) => (
          <button
            key={c}
            onClick={() => { setCat(c); setPage(1); }}
            className={
              cat === c
                ? "rounded-full bg-brand px-4 py-2 text-[12px] font-semibold glow-brand"
                : "rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-[12px] font-medium text-white/55 transition-colors hover:border-brand/40 hover:text-white"
            }
          >
            {c}
          </button>
        ))}
      </div>

      <p className="mt-6 text-[12.5px] text-white/40">
        {loading ? "Loading services…" : <>{total} {total === 1 ? "service" : "services"} found</>}
      </p>

      {error && (
        <p className="mt-4 flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-[12.5px] font-medium text-red-400">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
        </p>
      )}

      {loading && <CardGridSkeleton count={8} className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4" />}
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {!loading && gigs.map((g, i) => <GigCard key={g.id} g={g} nav={nav} i={i} />)}
      </div>

      {!loading && gigs.length === 0 && !error && (
        <div className="glass mt-4 rounded-2xl p-12 text-center">
          <p className="text-[14px] font-semibold">Одоогоор энэ шүүлтэд тохирох үйлчилгээ алга</p>
          <p className="mt-1.5 text-[12.5px] text-white/45">Өөр категори эсвэл хайлт туршиж үзээрэй.</p>
          <button
            onClick={() => { setQ(""); setCat("All"); setPage(1); }}
            className="mt-5 rounded-xl bg-brand px-5 py-2.5 text-[12.5px] font-bold text-fg-1 glow-brand"
          >
            Шүүлтүүр цэвэрлэх
          </button>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-white/60 transition-colors hover:border-white/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-[12.5px] text-white/50">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-white/60 transition-colors hover:border-white/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
