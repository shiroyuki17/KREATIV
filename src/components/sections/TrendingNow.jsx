import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { useNav } from "../../nav.jsx";
import { useHomeJobs, toJobCard } from "../../lib/homeData.js";
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

export default function TrendingNow() {
  const { nav } = useNav();
  const jobs = useHomeJobs();

  // Хамгийн олон санал авсан 4 зар. Өмнө нь mock-ийн зохиомол `proposals`
  // талбараар эрэмбэлдэг байсныг бодит /jobs-ийн proposalCount орлов.
  const trending = [...(jobs || [])]
    .sort((a, b) => (b.proposalCount || 0) - (a.proposalCount || 0))
    .slice(0, 4)
    .map(toJobCard);

  if (jobs && trending.length === 0) return null;

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

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {trending.map((job, i) => {
            const bids = job.raw.proposalCount || 0;
            return (
              <motion.button
                key={job.id}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.45, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -6, scale: 1.02 }}
                onClick={() => nav("project", job.raw)}
                className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br p-5 text-left transition-all duration-300 hover:border-brand/50 ${CAT_GRAD[job.cat] || CAT_GRAD.Dev}`}
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-soft">
                    {job.cat}
                  </span>
                  <span className="text-[11px] font-medium text-white/40">
                    {bids === 0 ? "No bids yet" : `${bids} ${bids === 1 ? "bid" : "bids"}`}
                  </span>
                </div>
                <p className="mt-3 line-clamp-2 font-display text-[14.5px] font-bold leading-snug text-white group-hover:text-brand-soft transition-colors">
                  {job.title}
                </p>
                <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-3.5">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Budget</p>
                    <p className="font-display text-[16px] font-bold text-mint">{job.budget}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Posted</p>
                    <p className="text-[12px] font-medium text-white/70">{job.posted}</p>
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
