import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BadgeCheck } from "lucide-react";
import { TALENT } from "../../data/mock.js";
import { useNav } from "../../nav.jsx";
import Reveal from "../fx/Reveal.jsx";
import TiltedCard from "../fx/TiltedCard.jsx";

// A curated row of large portfolio tiles — the same "verified studios" style
// showcase pattern used by talent-marketplace discovery pages, built from
// each specialist's own portfolio art (see FindTalent's TalentCard).
const TABS = ["Featured", "Design", "Dev", "AI", "Motion", "Writing", "Marketing"];

// While hovered, cycles through this specialist's other portfolio pieces —
// each tile gets its own timer since only the hovered one should animate.
function TalentTile({ f, tab, index, onClick }) {
  const [hover, setHover] = useState(false);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!hover || f.portfolio.length <= 1) return;
    const id = setInterval(() => setIdx((n) => (n + 1) % f.portfolio.length), 900);
    return () => clearInterval(id);
  }, [hover, f.portfolio.length]);

  useEffect(() => {
    if (!hover) setIdx(0);
  }, [hover]);

  const tile = f.portfolio[idx];

  return (
    <motion.button
      key={`${tab}-${f.name}`}
      layout
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.35, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="text-left"
    >
      <TiltedCard maxTilt={5} className="group relative aspect-[4/3] overflow-hidden rounded-2xl">
        <div className={`absolute inset-0 bg-gradient-to-br ${tile.grad} transition-all duration-500 group-hover:scale-105`} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-transparent" />
        {hover && f.portfolio.length > 1 && (
          <div className="absolute right-3 top-3 flex gap-1">
            {f.portfolio.map((_, pi) => (
              <span
                key={pi}
                className={`h-1 rounded-full transition-all duration-300 ${pi === idx ? "w-3 bg-white" : "w-1 bg-white/40"}`}
              />
            ))}
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 p-4">
          <p className="flex items-center gap-1.5 text-[13.5px] font-semibold text-white">
            {f.name}
            {f.verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-neon" />}
            {f.available && (
              <span className="ml-auto flex items-center gap-1 text-[10px] font-medium text-mint">
                <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-mint" />
                Available
              </span>
            )}
          </p>
          <p className="truncate text-[11.5px] text-white/70">{tile.label || f.role}</p>
        </div>
      </TiltedCard>
    </motion.button>
  );
}

export default function FeaturedWork() {
  const { nav } = useNav();
  const [tab, setTab] = useState("Featured");

  const shown =
    tab === "Featured"
      ? [...TALENT].sort((a, b) => b.rating - a.rating).slice(0, 4)
      : TALENT.filter((f) => f.cat === tab).slice(0, 4);

  return (
    <section className="relative py-10 md:py-16">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="flex flex-wrap items-end justify-between gap-3">
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
        </Reveal>

        <Reveal delay={0.1} className="mt-6 flex flex-wrap gap-2">
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
        </Reveal>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {shown.map((f, i) => (
              <TalentTile key={`${tab}-${f.name}`} f={f} tab={tab} index={i} onClick={() => nav("profile", f)} />
            ))}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
