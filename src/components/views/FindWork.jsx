import { useEffect, useMemo, useState } from "react";
import { Search, Star, BadgeCheck, Users, Sparkles, SlidersHorizontal, X, ChevronRight, ChevronDown } from "lucide-react";
import SpotlightCard from "../fx/SpotlightCard.jsx";
import { JOBS } from "../../data/mock.js";
import { useNav } from "../../nav.jsx";
import { useLive } from "../../live.jsx";
import AiPanel from "../ui/AiPanel.jsx";

const CATS = ["All", "Design", "Dev", "AI", "Motion", "Writing", "Marketing"];
const TYPES = ["Any", "Fixed", "Hourly"];
const SKILLS = ["React", "Figma", "Python", "Node.js", "3D", "TypeScript", "SEO", "Next.js"];
const LANGUAGES = ["English", "Spanish", "French", "German", "Portuguese", "Japanese"];
const SORTS = { relevant: "Most relevant", newest: "Newest first", proposals: "Fewest proposals" };

function Section({ title, children }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-t border-white/8 px-5 py-5 first:border-t-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-[11px] font-bold uppercase tracking-widest text-white/45 transition-colors hover:text-white/70"
      >
        {title}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "" : "-rotate-180"}`} />
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}

function Check({ label, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 py-1.5 text-[13px] text-white/65 transition-colors hover:text-white">
      <input type="checkbox" checked={checked} onChange={onChange} className="peer sr-only" />
      <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${checked ? "border-brand bg-brand" : "border-white/25"}`}>
        {checked && <svg viewBox="0 0 12 12" className="h-3 w-3 text-ink"><path d="M2 6.5L4.5 9L10 3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
      </span>
      {label}
    </label>
  );
}

function Filters({ cat, setCat, type, setType, skills, toggleSkill, budget, setBudget, langs, toggleLang, onClear }) {
  return (
    <div className="glass overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between px-5 py-4">
        <p className="inline-flex items-center gap-2 text-[13.5px] font-bold"><SlidersHorizontal className="h-4 w-4 text-brand-soft" /> Filter by</p>
        <button onClick={onClear} className="text-[11.5px] font-semibold text-white/40 transition-colors hover:text-brand-soft">Clear</button>
      </div>

      <Section title="Category">
        <div className="space-y-0.5">
          {CATS.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors ${cat === c ? "bg-brand/15 font-semibold text-brand-soft" : "text-white/60 hover:bg-white/5 hover:text-white"}`}
            >
              {c}
              {cat === c && <ChevronRight className="h-3.5 w-3.5" />}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Project type">
        {TYPES.map((t) => (
          <Check key={t} label={t} checked={type === t} onChange={() => setType(t)} />
        ))}
      </Section>

      <Section title="Budget">
        <div className="space-y-2">
          {[["any", "Any budget"], ["low", "Under $5,000"], ["mid", "$5,000 – $10,000"], ["high", "$10,000+"]].map(([k, label]) => (
            <Check key={k} label={label} checked={budget === k} onChange={() => setBudget(k)} />
          ))}
        </div>
      </Section>

      <Section title="Skills">
        <div className="flex flex-wrap gap-1.5">
          {SKILLS.map((s) => (
            <button
              key={s}
              onClick={() => toggleSkill(s)}
              className={skills.includes(s)
                ? "rounded-full border border-brand/60 bg-brand/15 px-3 py-1.5 text-[11.5px] font-semibold text-brand-soft"
                : "rounded-full border border-white/10 px-3 py-1.5 text-[11.5px] font-medium text-white/50 transition-colors hover:border-white/25 hover:text-white"}
            >
              {s}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Languages">
        {LANGUAGES.map((l) => (
          <Check key={l} label={l} checked={langs.includes(l)} onChange={() => toggleLang(l)} />
        ))}
      </Section>
    </div>
  );
}

export default function FindWork() {
  const { params, nav } = useNav();
  const { liveJobs } = useLive();
  const [q, setQ] = useState(params?.query || "");
  const [cat, setCat] = useState("All");
  const [type, setType] = useState("Any");
  const [budget, setBudget] = useState("any");
  const [skills, setSkills] = useState([]);
  const [langs, setLangs] = useState([]);
  const [sort, setSort] = useState("relevant");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => { if (params?.query) setQ(params.query); }, [params]);

  const toggleSkill = (s) => setSkills((a) => (a.includes(s) ? a.filter((x) => x !== s) : [...a, s]));
  const toggleLang = (l) => setLangs((a) => (a.includes(l) ? a.filter((x) => x !== l) : [...a, l]));
  const clear = () => { setCat("All"); setType("Any"); setBudget("any"); setSkills([]); setLangs([]); setQ(""); };

  const aiChips = [
    { label: "Newest briefs", run: () => setSort("newest") },
    { label: "Fewest proposals", run: () => setSort("proposals") },
    { label: "Fixed price only", run: () => setType("Fixed") },
    { label: "Under $5,000", run: () => setBudget("low") },
  ];

  const num = (b) => parseInt(String(b).replace(/[^0-9]/g, ""), 10) || 0;
  // "2h ago" / "1d ago" -> hours, so "newest first" has something real to sort by
  const postedHours = (s) => {
    const m = /^(\d+)([hd])/.exec(s || "");
    if (!m) return Infinity;
    return m[2] === "d" ? Number(m[1]) * 24 : Number(m[1]);
  };

  const results = useMemo(() => {
    let list = [...liveJobs, ...JOBS].filter((j) => {
      const okCat = cat === "All" || j.cat === cat;
      const okType = type === "Any" || j.type === type;
      const okSkill = skills.length === 0 || skills.some((s) => j.tags.includes(s));
      const okLang = langs.length === 0 || langs.some((l) => (j.languages || []).includes(l));
      const v = num(j.budget);
      const okBudget = budget === "any" || (budget === "low" && v < 5000) || (budget === "mid" && v >= 5000 && v <= 10000) || (budget === "high" && v > 10000);
      const hay = (j.title + j.client + j.tags.join(" ")).toLowerCase();
      const okQ = q.trim() === "" || hay.includes(q.toLowerCase());
      return okCat && okType && okSkill && okLang && okBudget && okQ;
    });
    if (sort === "proposals") list = [...list].sort((a, b) => a.proposals - b.proposals);
    if (sort === "newest") list = [...list].sort((a, b) => postedHours(a.posted) - postedHours(b.posted));
    return list;
  }, [q, cat, type, budget, skills, langs, sort, liveJobs]);

  const activeCount = (cat !== "All") + (type !== "Any") + (budget !== "any") + skills.length + langs.length;

  return (
    <div className="mx-auto max-w-6xl px-6 pb-24 pt-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-[12px] text-white/35">
        <button onClick={() => nav("home")} className="transition-colors hover:text-brand-soft">KREATIV</button>
        <span>›</span><span>Jobs</span><span>›</span>
        <span className="text-white/60">Browse all briefs</span>
      </nav>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[clamp(1.9rem,3.6vw,2.8rem)] font-bold text-brand text-glow tracking-tight">
            Open briefs for you
          </h1>
          <p className="mt-2 inline-flex items-center gap-2 text-[12.5px] text-white/45">
            <Sparkles className="h-3.5 w-3.5 text-brand-soft" /> AI-matched to your skills · updated live
          </p>
        </div>
      </div>

      {/* Search bar */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex min-w-[240px] flex-1 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 focus-within:border-brand/50">
          <Search className="h-4.5 w-4.5 shrink-0 text-white/40" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search briefs by skill, title, or client…"
            className="w-full bg-transparent text-[14px] outline-none placeholder:text-white/30"
          />
          {q && <button onClick={() => setQ("")} aria-label="Clear search"><X className="h-4 w-4 text-white/35 hover:text-white" /></button>}
        </div>
        <button
          onClick={() => setShowFilters((s) => !s)}
          className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[13px] font-medium text-white/70 lg:hidden"
        >
          <SlidersHorizontal className="h-4 w-4" /> Filters
          {activeCount > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-ink">{activeCount}</span>}
        </button>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[13px] text-white/75 outline-none [&>option]:bg-[#0c110e]"
        >
          {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <div className="mt-6 flex items-start gap-6">
      <div className="grid flex-1 gap-6 lg:grid-cols-[264px_1fr]">
        {/* Filters sidebar */}
        <div className={`${showFilters ? "block" : "hidden"} lg:block`}>
          <div className="lg:sticky lg:top-6">
            <Filters {...{ cat, setCat, type, setType, skills, toggleSkill, budget, setBudget, langs, toggleLang, onClear: clear }} />
          </div>
        </div>

        {/* Results */}
        <div className="min-w-0">
          <div className="flex items-center justify-between">
            <p className="text-[13px] text-white/50">
              <b className="text-white">{results.length}</b> {results.length === 1 ? "brief" : "briefs"} found
            </p>
            {activeCount > 0 && (
              <button onClick={clear} className="text-[12px] font-semibold text-brand-soft hover:text-white">Clear filters</button>
            )}
          </div>

          <div className="mt-4 space-y-3">
            {results.map((job, i) => (
              <SpotlightCard
                key={job.id}
                onClick={() => nav("project", job)}
                style={{ animationDelay: `${i * 55}ms` }}
                className="animate-rise-in cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:border-brand/40"
              >
                <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className={job.type === "Fixed"
                        ? "rounded-full border border-mint/30 bg-mint/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-mint"
                        : "rounded-full border border-neon/30 bg-neon/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-neon"}>
                        {job.type}
                      </span>
                      <span className="rounded-full border border-brand/25 bg-brand/8 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-brand-soft">{job.cat}</span>
                      {job.isNew && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/50 bg-brand/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-brand-soft">
                          <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-brand" />
                          New
                        </span>
                      )}
                      <span className="text-[11px] text-white/35">{job.posted}</span>
                    </div>
                    <h3 className="mt-2.5 font-display text-[16.5px] font-semibold leading-snug">{job.title}</h3>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-white/45">
                      <span className="inline-flex items-center gap-1">
                        {job.client}{job.verified && <BadgeCheck className="h-3.5 w-3.5 text-neon" />}
                      </span>
                      <span className="inline-flex items-center gap-1"><Star className="h-3 w-3 fill-amber-400 text-amber-400" />{job.rating}</span>
                      <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{job.proposals} proposals</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {job.tags.map((t) => (
                        <span key={t} className={`rounded-full border px-2.5 py-1 text-[10.5px] ${skills.includes(t) ? "border-brand/50 bg-brand/10 text-brand-soft" : "border-white/10 text-white/45"}`}>{t}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center justify-between gap-4 border-t border-white/8 pt-4 sm:flex-col sm:items-end sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
                    <p className="font-display text-lg font-bold">{job.budget}</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); nav("project", job); }}
                      className="rounded-xl bg-brand px-5 py-2.5 text-[12.5px] font-bold text-ink glow-brand transition-shadow hover:shadow-[0_0_30px_rgba(0,211,149,0.5)]"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </SpotlightCard>
            ))}
          </div>

          {results.length === 0 && (
            <div className="glass mt-4 rounded-2xl p-12 text-center">
              <Search className="mx-auto h-9 w-9 text-white/20" />
              <p className="mt-4 text-[14.5px] font-semibold">No briefs match those filters</p>
              <p className="mt-1.5 text-[12.5px] text-white/45">Try a broader category, clear the budget range, or remove some skills.</p>
              <button onClick={clear} className="mt-5 rounded-xl bg-brand px-5 py-2.5 text-[12.5px] font-bold text-ink glow-brand">
                Reset filters
              </button>
            </div>
          )}
        </div>
      </div>

      <AiPanel title="AI Job Match" chips={aiChips} onRefine={setQ} />
      </div>
    </div>
  );
}
