import { useEffect, useMemo, useState } from "react";
import { Search, Star, BadgeCheck, SlidersHorizontal, Sparkles } from "lucide-react";
import { TALENT } from "../../data/mock.js";
import { useNav } from "../../nav.jsx";
import AiPanel from "../ui/AiPanel.jsx";

const CATS = ["All", "Design", "Dev", "AI", "Motion", "Writing", "Marketing"];
const SORTS = {
  relevant: "Most relevant",
  rateLow: "Rate: low to high",
  rateHigh: "Rate: high to low",
  rating: "Top rated",
  followers: "Most followed",
};

function followersNum(v) {
  const n = parseFloat(v);
  return v.includes("K") ? n * 1000 : n;
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

function TalentCard({ f, nav, style }) {
  const topRated = f.rating >= 4.9;

  return (
    <div style={style} className="glass animate-rise-in rounded-2xl p-5 transition-transform duration-300 hover:-translate-y-0.5 hover:scale-[1.02] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand/50 to-neon/40 font-display text-[13px] font-bold ring-1 ring-white/15">
            {f.initials}
            {f.available && (
              <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#101014] bg-mint" />
            )}
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[14.5px] font-semibold">
              <span className="truncate">{f.name}</span>
              {f.verified && <BadgeCheck className="h-4 w-4 shrink-0 text-neon" />}
            </p>
            <p className="truncate text-[12px] text-white/45">{f.role} · {f.location}</p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <button className="rounded-full border border-white/15 px-5 py-2.5 text-[13px] font-semibold text-white/80 transition-colors hover:border-white/30 hover:text-white">
            Follow
          </button>
          <button
            onClick={() => nav("messages")}
            className="rounded-full bg-gradient-to-r from-brand to-brand-soft px-5 py-2.5 text-[13px] font-bold text-ink glow-brand transition-shadow hover:shadow-[0_0_30px_rgba(0,211,149,0.55)]"
          >
            Message
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2.5 border-y border-white/8 py-3.5">
        <Stat label="Earned" value={f.earned} />
        <Stat label="Hired" value={`${f.hired}x`} />
        <Stat label="Rating" value={f.rating} star />
        <Stat label="Followers" value={f.followers} />
        <div className="ml-auto flex items-center gap-2">
          {topRated && (
            <span className="inline-flex items-center gap-1 rounded-full border border-brand/40 bg-brand/10 px-2.5 py-1 text-[10.5px] font-bold text-brand-soft">
              <Sparkles className="h-3 w-3" /> Top Rated
            </span>
          )}
          <span className="font-display text-[14px] font-bold text-mint">{f.rate}</span>
        </div>
      </div>

      <p className="mt-3.5 text-[13px] leading-relaxed text-white/60">{f.tagline}</p>

      <div className="mt-4 flex gap-1.5 overflow-hidden rounded-xl">
        {f.portfolio.map((tile, i) => (
          <div key={i} className={`relative h-28 flex-1 bg-gradient-to-br ${tile.grad}`}>
            {tile.label && (
              <span className="absolute inset-x-2 bottom-2 line-clamp-2 text-[10px] font-semibold leading-tight text-white/90">
                {tile.label}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        {f.skills.map((s) => (
          <span key={s} className="rounded-full border border-white/10 px-2.5 py-1 text-[10.5px] text-white/50">
            {s}
          </span>
        ))}
        <button
          onClick={() => nav("profile", f)}
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
  const [cat, setCat] = useState("All");
  const [sort, setSort] = useState("relevant");
  const [availableOnly, setAvailableOnly] = useState(false);

  useEffect(() => {
    if (params?.query) setQ(params.query);
  }, [params]);

  const chips = [
    { label: "Top rated designers", run: () => { setCat("Design"); setSort("rating"); } },
    { label: "Available now", run: () => setAvailableOnly(true) },
    { label: "Best rate for your budget", run: () => setSort("rateLow") },
    { label: "Most followed", run: () => setSort("followers") },
  ];

  const results = useMemo(() => {
    let list = TALENT.filter((f) => {
      const matchCat = cat === "All" || f.cat === cat;
      const matchAvail = !availableOnly || f.available;
      const hay = (f.name + f.role + f.skills.join(" ")).toLowerCase();
      const matchQ = q.trim() === "" || hay.includes(q.toLowerCase());
      return matchCat && matchAvail && matchQ;
    });
    if (sort === "rateLow") list = [...list].sort((a, b) => a.rateNum - b.rateNum);
    if (sort === "rateHigh") list = [...list].sort((a, b) => b.rateNum - a.rateNum);
    if (sort === "rating") list = [...list].sort((a, b) => b.rating - a.rating);
    if (sort === "followers") list = [...list].sort((a, b) => followersNum(b.followers) - followersNum(a.followers));
    return list;
  }, [q, cat, sort, availableOnly]);

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
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by skill, role, or name…"
              className="w-full bg-transparent text-[14px] outline-none placeholder:text-white/30"
            />
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
            <SlidersHorizontal className="h-4 w-4 text-white/40" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="bg-transparent text-[13px] text-white/75 outline-none [&>option]:bg-[#14141a]"
            >
              {Object.entries(SORTS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {CATS.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={
                cat === c
                  ? "rounded-full bg-brand px-4 py-2 text-[12px] font-semibold glow-brand"
                  : "rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-[12px] font-medium text-white/55 transition-colors hover:border-brand/40 hover:text-white"
              }
            >
              {c}
            </button>
          ))}
          <span className="mx-1 h-4 w-px bg-white/10" />
          <button
            onClick={() => setAvailableOnly((v) => !v)}
            className={
              availableOnly
                ? "inline-flex items-center gap-1.5 rounded-full bg-mint/15 px-4 py-2 text-[12px] font-semibold text-mint"
                : "inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-[12px] font-medium text-white/55 transition-colors hover:border-mint/40 hover:text-white"
            }
          >
            <span className={`h-2 w-2 rounded-full ${availableOnly ? "bg-mint" : "bg-white/30"}`} />
            Available for work
          </button>
        </div>

        <p className="mt-6 text-[12.5px] text-white/40">
          {results.length} {results.length === 1 ? "specialist" : "specialists"} found
        </p>

        {/* Results */}
        <div className="mt-4 space-y-4">
          {results.map((f, i) => (
            <TalentCard key={f.name} f={f} nav={nav} style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }} />
          ))}
        </div>

        {results.length === 0 && (
          <div className="glass mt-4 rounded-2xl p-12 text-center">
            <p className="text-[14px] font-semibold">No specialists match those filters</p>
            <p className="mt-1.5 text-[12.5px] text-white/45">
              Try a broader category or a different search term.
            </p>
            <button
              onClick={() => { setQ(""); setCat("All"); setAvailableOnly(false); }}
              className="mt-5 rounded-xl bg-brand px-5 py-2.5 text-[12.5px] font-bold text-ink glow-brand"
            >
              Reset filters
            </button>
          </div>
        )}
      </div>

      <AiPanel title="AI Talent Match" chips={chips} onRefine={setQ} />
    </div>
  );
}
