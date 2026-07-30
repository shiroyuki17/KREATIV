import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { TALENT, JOBS } from "../../data/mock.js";
import { useNav } from "../../nav.jsx";
import Reveal from "../fx/Reveal.jsx";

const byName = (n) => TALENT.find((t) => t.name === n);
const byId = (id) => JOBS.find((j) => j.id === id);

// Contra's big "Standout projects" masonry, adapted: mixes specialist
// portfolio art with live briefs so it reads as one wall of real activity
// rather than a second, redundant talent grid.
const TILES = [
  { kind: "talent", talent: byName("Ava Torres"), tileIndex: 1, tall: true },
  { kind: "job", job: byId(4), tall: false },
  { kind: "talent", talent: byName("Daniel Kim"), tileIndex: 3, tall: false },
  { kind: "talent", talent: byName("Mina Okafor"), tileIndex: 1, tall: true },
  { kind: "job", job: byId(12), tall: false },
  { kind: "talent", talent: byName("Sara Cohen"), tileIndex: 0, tall: false },
  { kind: "talent", talent: byName("Tom Beck"), tileIndex: 2, tall: true },
  { kind: "job", job: byId(6), tall: false },
];

export default function StandoutWork() {
  const { nav } = useNav();

  return (
    <section className="relative py-16">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-soft">
              — On KREATIV right now
            </p>
            <h2 className="mt-2 font-display text-2xl font-bold tracking-tight">
              Standout work making waves
            </h2>
          </div>
        </Reveal>

        <div className="mt-7 grid auto-rows-[140px] grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {TILES.map((t, i) => {
            const motionProps = {
              initial: { opacity: 0, scale: 0.94 },
              whileInView: { opacity: 1, scale: 1 },
              viewport: { once: true, margin: "-60px" },
              transition: { duration: 0.45, delay: (i % 4) * 0.06, ease: [0.22, 1, 0.36, 1] },
              whileHover: { scale: 1.03 },
              className: t.tall ? "row-span-2" : "",
            };

            if (t.kind === "talent") {
              const tile = t.talent.portfolio[t.tileIndex];
              return (
                <motion.button
                  key={i}
                  {...motionProps}
                  onClick={() => nav("profile", t.talent)}
                  className={`${motionProps.className} group relative overflow-hidden rounded-2xl bg-gradient-to-br text-left ${tile.grad}`}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                  <div className="absolute inset-x-3 bottom-3 opacity-0 transition-opacity group-hover:opacity-100">
                    <p className="text-[12px] font-semibold text-white">{t.talent.name}</p>
                    <p className="text-[10.5px] text-white/70">{tile.label || t.talent.role}</p>
                  </div>
                </motion.button>
              );
            }
            return (
              <motion.button
                key={i}
                {...motionProps}
                onClick={() => nav("project", t.job)}
                className={`${motionProps.className} group relative flex flex-col justify-end overflow-hidden rounded-2xl border border-white/8 bg-white/[0.03] p-3.5 text-left transition-colors hover:border-brand/40`}
              >
                <p className="line-clamp-3 text-[12.5px] font-semibold leading-snug text-white/85">
                  {t.job.title}
                </p>
                <p className="mt-2 text-[11px] font-bold text-mint">{t.job.budget}</p>
              </motion.button>
            );
          })}
        </div>

        <div className="mt-8 flex justify-center">
          <button
            onClick={() => nav("find-work")}
            className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/[0.03] px-6 py-3 text-[13px] font-semibold text-white/80 transition-colors hover:border-white/25 hover:text-white"
          >
            Explore all briefs
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
