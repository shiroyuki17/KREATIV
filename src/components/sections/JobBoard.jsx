import { useState } from "react";
import { Star, BadgeCheck, ArrowRight } from "lucide-react";
import SpotlightCard from "../fx/SpotlightCard.jsx";
import BlurText from "../fx/BlurText.jsx";
import { JOBS } from "../../data/mock.js";
import { useNav } from "../../nav.jsx";

const FILTERS = ["All", "Design", "Dev", "AI", "Motion", "Writing", "Marketing"];

const PREVIEW_COUNT = 6;

export default function JobBoard() {
  const { nav } = useNav();
  const [filter, setFilter] = useState("All");
  const matching = JOBS.filter((j) => filter === "All" || j.cat === filter);
  const jobs = matching.slice(0, PREVIEW_COUNT); // landing shows a taste, not the whole board

  return (
    <section id="jobs" className="relative py-12 md:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-soft">
              — Open briefs
            </p>
            <h2 className="mt-3 font-display text-[clamp(1.9rem,3.6vw,2.8rem)] font-bold text-brand text-glow tracking-tight">
              <BlurText text="The live job board" />
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={
                  filter === f
                    ? "rounded-full bg-brand px-4 py-2 text-[12px] font-semibold glow-brand"
                    : "rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-[12px] font-medium text-white/55 transition-colors hover:border-brand/40 hover:text-white"
                }
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {jobs.map((job, i) => (
            <SpotlightCard
              key={job.id}
              onClick={() => nav("project", job)}
              style={{ animationDelay: `${i * 70}ms` }}
              className="animate-rise-in cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-[0_0_34px_rgba(0,211,149,0.16)]"
            >
              <div className="flex h-full flex-col p-6">
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={
                      job.type === "Fixed"
                        ? "rounded-full border border-mint/30 bg-mint/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-mint"
                        : "rounded-full border border-neon/30 bg-neon/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-neon"
                    }
                  >
                    {job.type}
                  </span>
                  <span className="text-[11px] text-white/35">{job.posted}</span>
                </div>

                <h3 className="mt-4 font-display text-[16.5px] font-semibold leading-snug">
                  {job.title}
                </h3>

                <div className="mt-2.5 flex items-center gap-1.5 text-[12px] text-white/50">
                  {job.client}
                  {job.verified && <BadgeCheck className="h-3.5 w-3.5 text-neon" />}
                  <span className="ml-1 inline-flex items-center gap-1">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    {job.rating}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {job.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-white/10 px-2.5 py-1 text-[10.5px] text-white/45"
                    >
                      {t}
                    </span>
                  ))}
                </div>

                <div className="mt-auto flex items-center justify-between border-t border-white/8 pt-5">
                  <div>
                    <p className="font-display text-lg font-bold">{job.budget}</p>
                    <p className="text-[10.5px] text-white/35">
                      {job.proposals} proposals
                    </p>
                  </div>
                  <button className="inline-flex items-center gap-1.5 rounded-xl border border-brand/40 bg-brand/15 px-4 py-2.5 text-[12.5px] font-semibold text-brand-soft transition-all hover:bg-brand hover:text-ink">
                    Apply
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </SpotlightCard>
          ))}
        </div>

        {matching.length > PREVIEW_COUNT && (
          <div className="mt-8 flex justify-center">
            <button
              onClick={() => nav("find-work")}
              className="group inline-flex items-center gap-2 rounded-xl border border-white/12 px-6 py-3 text-[13.5px] font-semibold text-white/80 transition-colors hover:border-brand/40 hover:text-white"
            >
              Browse all {matching.length} briefs
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
