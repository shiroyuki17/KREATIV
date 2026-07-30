import { motion } from "framer-motion";
import { JOBS } from "../../data/mock.js";
import { useNav } from "../../nav.jsx";
import Reveal from "../fx/Reveal.jsx";
import TiltedCard from "../fx/TiltedCard.jsx";

// A second themed showcase row (distinct visual from FeaturedWork's people
// tiles) — bold text-on-gradient cards built from real briefs, category
// colored so the color itself carries meaning.
const CAT_GRAD = {
  Design: "from-brand/70 to-brand-soft/25",
  Dev: "from-neon/60 to-brand/25",
  AI: "from-violet/60 to-violet-soft/25",
  Motion: "from-mint/60 to-neon/25",
  Writing: "from-amber-400/55 to-rose-400/20",
  Marketing: "from-rose-400/55 to-violet/20",
};

const PICKED = [JOBS[0], JOBS[1], JOBS[3], JOBS[4]];

export default function LiveBriefs() {
  const { nav } = useNav();

  return (
    <section className="relative py-16">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-soft">
              — Live briefs
            </p>
            <h2 className="mt-2 font-display text-2xl font-bold tracking-tight">
              Worth applying to this week
            </h2>
          </div>
          <button
            onClick={() => nav("find-work")}
            className="text-[12.5px] font-semibold text-brand-soft transition-colors hover:text-white"
          >
            View more →
          </button>
        </Reveal>

        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PICKED.map((job, i) => (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
            >
              <TiltedCard maxTilt={6} className="aspect-[4/3]">
                <button
                  onClick={() => nav("project", job)}
                  className={`group relative flex h-full w-full flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br p-4 text-left ${CAT_GRAD[job.cat]}`}
                >
                  <span className="w-fit rounded-full bg-black/25 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white/90 backdrop-blur-sm">
                    {job.cat}
                  </span>
                  <div>
                    <p className="font-display text-[15px] font-bold leading-snug text-white [text-wrap:balance]">
                      {job.title}
                    </p>
                    <p className="mt-1.5 text-[12px] font-semibold text-white/80">{job.budget}</p>
                  </div>
                </button>
              </TiltedCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
