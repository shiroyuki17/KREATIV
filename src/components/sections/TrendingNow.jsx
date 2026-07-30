import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { JOBS, TALENT } from "../../data/mock.js";
import { useNav } from "../../nav.jsx";
import Reveal from "../fx/Reveal.jsx";

// Contra's "Trending topics" strip, adapted: instead of community challenges
// (a social-network concept KREATIV doesn't have), these are the briefs
// pulling the most proposals right now — same card shape, real data.
const CAT_GRAD = {
  Design: "from-brand/30 via-transparent to-transparent",
  Dev: "from-neon/30 via-transparent to-transparent",
  AI: "from-violet/30 via-transparent to-transparent",
  Motion: "from-mint/30 via-transparent to-transparent",
  Writing: "from-amber-400/25 via-transparent to-transparent",
  Marketing: "from-rose-400/25 via-transparent to-transparent",
};

const TRENDING = [...JOBS].sort((a, b) => b.proposals - a.proposals).slice(0, 4);

export default function TrendingNow() {
  const { nav } = useNav();

  return (
    <section className="relative py-10">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="flex items-center justify-between">
          <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">
            Trending briefs <ArrowUpRight className="h-3.5 w-3.5" />
          </p>
          <button
            onClick={() => nav("find-work")}
            className="text-[12px] font-medium text-white/40 transition-colors hover:text-brand-soft"
          >
            View all briefs
          </button>
        </Reveal>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TRENDING.map((job, i) => {
            const applicants = TALENT.filter((t) => t.cat === job.cat).slice(0, 3);
            return (
              <motion.button
                key={job.id}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.45, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -4 }}
                onClick={() => nav("project", job)}
                className={`relative overflow-hidden rounded-2xl border border-white/8 bg-gradient-to-br p-4 text-left transition-colors hover:border-white/20 ${CAT_GRAD[job.cat]}`}
              >
                <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-white/90">
                  {job.title}
                </p>
                <div className="mt-4 flex items-center justify-between">
                  <div>
                    <p className="font-display text-[15px] font-bold text-white">{job.budget}</p>
                    <p className="text-[10.5px] text-white/40">{job.proposals} proposals</p>
                  </div>
                  <div className="flex -space-x-2">
                    {applicants.map((t) => (
                      <span
                        key={t.name}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-brand/60 to-neon/50 text-[9px] font-bold ring-2 ring-[#04070a]"
                      >
                        {t.initials}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
