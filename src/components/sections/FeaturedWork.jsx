import { useState } from "react";
import { BadgeCheck } from "lucide-react";
import { TALENT } from "../../data/mock.js";
import { useNav } from "../../nav.jsx";

// A curated row of large portfolio tiles — the same "verified studios" style
// showcase pattern used by talent-marketplace discovery pages, built from
// each specialist's own portfolio art (see FindTalent's TalentCard).
const TABS = ["Featured", "Design", "Dev", "AI", "Motion", "Writing", "Marketing"];

export default function FeaturedWork() {
  const { nav } = useNav();
  const [tab, setTab] = useState("Featured");

  const shown =
    tab === "Featured"
      ? [...TALENT].sort((a, b) => b.rating - a.rating).slice(0, 4)
      : TALENT.filter((f) => f.cat === tab).slice(0, 4);

  return (
    <section className="relative py-16">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-soft">
              — Featured work
            </p>
            <h2 className="mt-2 font-display text-2xl font-bold tracking-tight">
              Hand-picked, verified specialists
            </h2>
          </div>
          <button
            onClick={() => nav("find-talent")}
            className="text-[12.5px] font-semibold text-brand-soft transition-colors hover:text-white"
          >
            View more →
          </button>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={
                tab === t
                  ? "rounded-full bg-brand px-4 py-1.5 text-[12px] font-semibold text-ink glow-brand"
                  : "rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-[12px] font-medium text-white/55 transition-colors hover:border-brand/40 hover:text-white"
              }
            >
              {t}
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {shown.map((f) => (
            <button
              key={f.name}
              onClick={() => nav("profile", f)}
              className="group relative aspect-[4/3] overflow-hidden rounded-2xl text-left"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${f.portfolio[0].grad} transition-transform duration-500 group-hover:scale-105`} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4">
                <p className="flex items-center gap-1.5 text-[13.5px] font-semibold text-white">
                  {f.name}
                  {f.verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-neon" />}
                </p>
                <p className="truncate text-[11.5px] text-white/70">{f.role}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
