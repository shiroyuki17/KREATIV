import { useEffect, useState } from "react";
import Avatar from "../ui/Avatar.jsx";
import { Search, Star, BadgeCheck, SlidersHorizontal, Sparkles, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { useNav } from "../../nav.jsx";
import { avatarSrc } from "../../lib/authApi.js";
import { fetchFreelancers, followUser, unfollowUser, fetchMyFollowing } from "../../lib/talentApi.js";
import AiPanel from "../ui/AiPanel.jsx";
import { CardGridSkeleton } from "../ui/Skeleton.jsx";
import Select from "../ui/Select.jsx";

const CATS = ["All", "Design", "Dev", "AI", "Motion", "Writing", "Marketing"];
const SORTS = {
  relevant: "Most relevant",
  rateLow: "Rate: low to high",
  rateHigh: "Rate: high to low",
  rating: "Top rated",
};

function rateLabel(f) {
  if (f.priceMin == null) return "Rate on request";
  if (f.priceMax && f.priceMax !== f.priceMin) return `$${f.priceMin}–${f.priceMax}/hr`;
  return `$${f.priceMin}/hr`;
}

function initialsOf(name) {
  return (name || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

function Stat({ label, value, star }) {
  return (
    <div className="text-center">
      <p className="flex items-center justify-center gap-1 font-display text-[13.5px] font-bold text-white">
        {star && <Star className="h-3 w-3 fill-amber-400 text-amber-400" />}
        {value}
      </p>
      <p className="text-[9px] font-semibold uppercase tracking-wider text-white/35">{label}</p>
    </div>
  );
}

function TalentCard({ f, nav, style, isFollowing, onToggleFollow }) {
  const isNew = f.ratingAvg === 0 && f.jobsCompleted === 0;
  const topRated = f.ratingAvg >= 4.8;
  const avatarUrl = avatarSrc(f.avatarUrl);

  return (
    <div style={style} className="glass animate-rise-in rounded-2xl p-5 transition-transform duration-300 hover:-translate-y-0.5 hover:scale-[1.02] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar src={avatarUrl} name={f.name} seed={f.userId} size="h-12 w-12 text-[31px]" />
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[14.5px] font-semibold">
              <span className="truncate">{f.name}</span>
            </p>
            <p className="truncate text-[12px] text-white/45">{f.headline || "Freelancer"}</p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => onToggleFollow(f.userId)}
            className={
              isFollowing
                ? "rounded-full border border-brand/50 bg-brand/15 px-5 py-2.5 text-[13px] font-semibold text-brand-soft transition-colors"
                : "rounded-full border border-white/15 px-5 py-2.5 text-[13px] font-semibold text-white/80 transition-colors hover:border-white/30 hover:text-white"
            }
          >
            {isFollowing ? "Following" : "Follow"}
          </button>
          <button
            onClick={() => nav("messages", { withUserId: f.userId })}
            className="rounded-full bg-brand px-5 py-2.5 text-[13px] font-bold text-fg-1 glow-brand transition-shadow"
          >
            Message
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2.5 border-y border-white/8 py-3.5">
        <Stat label="Rating" value={f.ratingAvg > 0 ? f.ratingAvg.toFixed(1) : "—"} star={f.ratingAvg > 0} />
        <Stat label="Hired" value={`${f.jobsCompleted}x`} />
        <div className="ml-auto flex items-center gap-2">
          {isNew && (
            <span className="inline-flex items-center gap-1 rounded-full border border-neon/40 bg-neon/10 px-2.5 py-1 text-[10.5px] font-bold text-neon">
              New on KREATIV
            </span>
          )}
          {topRated && (
            <span className="inline-flex items-center gap-1 rounded-full border border-brand/40 bg-brand/10 px-2.5 py-1 text-[10.5px] font-bold text-brand-soft">
              <Sparkles className="h-3 w-3" /> Top Rated
            </span>
          )}
          <span className="font-display text-[14px] font-bold text-mint">{rateLabel(f)}</span>
        </div>
      </div>

      {f.bio && <p className="mt-3.5 text-[13px] leading-relaxed text-white/60">{f.bio}</p>}

      {f.portfolio.length > 0 && (
        <div className="mt-4 space-y-1.5">
          {f.portfolio.map((p) => (
            <div key={p.id} className="rounded-xl border border-white/8 bg-white/[0.03] px-3.5 py-2.5">
              <p className="truncate text-[12.5px] font-semibold text-white/85">{p.title}</p>
              {p.description && <p className="truncate text-[11px] text-white/40">{p.description}</p>}
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        {f.skills.map((s) => (
          <span key={s} className="rounded-full border border-white/10 px-2.5 py-1 text-[10.5px] text-white/50">
            {s}
          </span>
        ))}
        <button
          onClick={() => nav("profile", { userId: f.userId })}
          className="ml-auto text-[12px] font-semibold text-brand-soft transition-colors hover:text-white"
        >
          View profile →
        </button>
      </div>
    </div>
  );
}

export default function FindTalent() {
  const { params, nav } = useNav();
  const [q, setQ] = useState(params?.query || "");
  // Home хуудасны категорийн картууд `{ category: "Dev" }` дамжуулна.
  const [cat, setCat] = useState(params?.category || "All");
  const [sort, setSort] = useState("relevant");
  const [page, setPage] = useState(1);

  const [freelancers, setFreelancers] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Дагаж байгаа хүмүүсийг НЭГ дуудлагаар татна — карт тус бүр өөрөө
  // асуувал 12 хүсэлт зэрэг явна.
  const [following, setFollowing] = useState(() => new Set());

  useEffect(() => {
    fetchMyFollowing()
      .then((res) => setFollowing(new Set(res.following || [])))
      .catch(() => {}); // нэвтрээгүй бол дагах товч ажиллахгүй, хуудас хэвийн
  }, []);

  // Хариу хүлээхгүй тэр дор нь UI-г сольж (optimistic), сервер унавал
  // эргүүлж буцаана — дагах нь эргэлт буцалтгүй үйлдэл биш тул зохимжтой.
  const toggleFollow = async (userId) => {
    const wasFollowing = following.has(userId);
    setFollowing((s) => {
      const next = new Set(s);
      wasFollowing ? next.delete(userId) : next.add(userId);
      return next;
    });
    try {
      if (wasFollowing) await unfollowUser(userId);
      else await followUser(userId);
    } catch (err) {
      setFollowing((s) => {
        const next = new Set(s);
        wasFollowing ? next.add(userId) : next.delete(userId);
        return next;
      });
      setError(err.message);
    }
  };

  useEffect(() => {
    if (params?.query) setQ(params.query);
    // Өмнө нь категорийн картууд шүүлтүүрийн оронд ЧӨЛӨӨТ ХАЙЛТААР
    // ("AI Services" гэх мэт системд байдаггүй мөрөөр) дамжуулдаг тул
    // үргэлж хоосон үр дүн гардаг байв.
    if (params?.category) { setCat(params.category); setPage(1); }
  }, [params]);

  const chips = [
    { label: "Top rated", run: () => setSort("rating") },
    { label: "Best rate for your budget", run: () => setSort("rateLow") },
    { label: "AI specialists", run: () => setCat("AI") },
    { label: "Designers", run: () => setCat("Design") },
  ];

  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetchFreelancers({
          q: q.trim() || undefined,
          category: cat !== "All" ? cat : undefined,
          sort,
          page,
          pageSize: 12,
        });
        setFreelancers(res.freelancers);
        setTotal(res.total);
        setTotalPages(res.totalPages);
      } catch (err) {
        setError(err.message);
        setFreelancers([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q, cat, sort, page]);

  return (
    <div className="mx-auto max-w-[1400px] px-6 pb-24 pt-8 xl:flex xl:items-start xl:gap-8">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-soft">
          — Find talent
        </p>
        <h1 className="mt-3 font-display text-[clamp(1.9rem,3.6vw,2.8rem)] font-bold text-brand text-glow tracking-tight">
          Hire vetted specialists
        </h1>

        {/* Search + sort */}
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <div className="flex min-w-[240px] flex-1 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 focus-within:border-brand/50">
            <Search className="h-4.5 w-4.5 shrink-0 text-white/40" />
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              placeholder="Search by skill, role, or name…"
              className="w-full bg-transparent text-[14px] outline-none placeholder:text-white/30"
            />
          </div>
          <Select
            icon={SlidersHorizontal}
            value={sort}
            onChange={(v) => { setSort(v); setPage(1); }}
            options={Object.entries(SORTS).map(([k, v]) => ({ value: k, label: v }))}
          />
        </div>

        {/* Filters */}
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
          {loading ? "Loading specialists…" : <>{total} {total === 1 ? "specialist" : "specialists"} found</>}
        </p>

        {error && (
          <p className="mt-4 flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-[12.5px] font-medium text-red-400">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
          </p>
        )}

        {/* Results */}
        {loading && <CardGridSkeleton count={5} className="mt-4 space-y-4" />}
        <div className="mt-4 space-y-4">
          {!loading && freelancers.map((f, i) => (
            <TalentCard
              key={f.id}
              f={f}
              nav={nav}
              style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}
              isFollowing={following.has(f.userId)}
              onToggleFollow={toggleFollow}
            />
          ))}
        </div>

        {!loading && freelancers.length === 0 && !error && (
          <div className="glass mt-4 rounded-2xl p-12 text-center">
            <p className="text-[14px] font-semibold">No specialists match those filters</p>
            <p className="mt-1.5 text-[12.5px] text-white/45">
              Try a broader category or a different search term.
            </p>
            <button
              onClick={() => { setQ(""); setCat("All"); setPage(1); }}
              className="mt-5 rounded-xl bg-brand px-5 py-2.5 text-[12.5px] font-bold text-fg-1 glow-brand"
            >
              Reset filters
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

      <AiPanel title="AI Talent Match" chips={chips} onRefine={setQ} />
    </div>
  );
}
