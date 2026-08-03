import {
  Sparkles,
  Code2,
  Palette,
  Megaphone,
  PenTool,
  Headphones,
  Landmark,
  Scale,
  Users,
  Wrench,
} from "lucide-react";
import SpotlightCard from "../fx/SpotlightCard.jsx";
import BlurText from "../fx/BlurText.jsx";
import { CATEGORIES } from "../../data/mock.js";
import { useNav } from "../../nav.jsx";

const ICONS = { Sparkles, Code2, Palette, Megaphone, PenTool, Headphones, Landmark, Scale, Users, Wrench };

export default function Categories() {
  const { nav } = useNav();
  const goCat = (label) => nav("find-talent", { query: label.split(/ [&/]|&/)[0].trim() });

  return (
    <section id="categories" className="relative py-12 md:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-soft">
          — Browse categories
        </p>
        <h2 className="mt-3 font-display text-[clamp(1.9rem,3.6vw,2.8rem)] font-bold text-brand text-glow tracking-tight">
          <BlurText text="Find talent by skill" />
        </h2>

        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {CATEGORIES.map(({ label, count, icon }, i) => {
            const Icon = ICONS[icon];
            return (
              <SpotlightCard
                key={label}
                onClick={() => goCat(label)}
                style={{ animationDelay: `${i * 50}ms` }}
                className="animate-rise-in cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:border-brand/40"
              >
                <div className="p-5">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-brand/30 bg-brand/10 text-brand-soft transition-all duration-300 group-hover:bg-brand group-hover:text-white group-hover:shadow-[0_0_20px_rgba(0,211,149,0.5)]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <p className="mt-4 text-[14px] font-semibold leading-snug">{label}</p>
                  <p className="mt-1 text-[11px] text-white/40">{count}</p>
                </div>
              </SpotlightCard>
            );
          })}
        </div>
      </div>
    </section>
  );
}
