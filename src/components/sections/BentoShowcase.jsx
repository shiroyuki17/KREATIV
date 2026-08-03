import { Flame, Star, BadgeCheck, ArrowRight, Users, Zap } from "lucide-react";
import SpotlightCard from "../fx/SpotlightCard.jsx";
import Magnet from "../fx/Magnet.jsx";
import CountUp from "../fx/CountUp.jsx";
import BlurText from "../fx/BlurText.jsx";
import { JOBS, TALENT } from "../../data/mock.js";
import { useNav } from "../../nav.jsx";
import { useLive } from "../../live.jsx";

const featured = JOBS.find((j) => j.featured);

export default function BentoShowcase() {
  const { nav } = useNav();
  const { openBriefs } = useLive();
  return (
    <section id="showcase" className="relative py-12 md:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-soft">
          — Live on KREATIV
        </p>
        <h2 className="mt-3 font-display text-[clamp(1.9rem,3.6vw,2.8rem)] font-bold text-brand text-glow tracking-tight">
          <BlurText text="One marketplace. Every signal live." />
        </h2>

        <div className="mt-12 grid gap-4 md:grid-cols-4 md:[grid-template-rows:repeat(2,minmax(180px,auto))]">
          {/* Large: featured job */}
          <SpotlightCard className="md:col-span-2 md:row-span-2 transition-transform duration-300 hover:scale-[1.015]">
            <div className="relative flex h-full flex-col p-7">
              <div
                aria-hidden="true"
                className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand/25 blur-3xl transition-all duration-700 group-hover:scale-125 group-hover:blur-[70px]"
              />
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-brand/30 bg-brand/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-brand-soft">
                <Flame className="h-3 w-3" />
                Featured brief
              </span>
              <h3 className="mt-5 max-w-sm font-display text-2xl font-bold leading-snug">
                {featured.title}
              </h3>
              <div className="mt-3 flex items-center gap-2 text-[13px] text-white/55">
                {featured.client}
                <BadgeCheck className="h-4 w-4 text-neon" />
                <span className="inline-flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  {featured.rating}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {featured.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full border border-white/10 px-3 py-1 text-[11px] text-white/50"
                  >
                    {t}
                  </span>
                ))}
              </div>
              <div className="mt-auto flex items-center justify-between pt-8">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-white/40">
                    {featured.type} budget
                  </p>
                  <p className="font-display text-2xl font-bold text-mint">
                    {featured.budget}
                  </p>
                </div>
                <Magnet>
                  <button
                    onClick={() => nav("project", featured)}
                    className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-[13px] font-semibold glow-brand transition-shadow hover:shadow-[0_0_40px_rgba(0,211,149,0.6)]"
                  >
                    Apply Now
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </Magnet>
              </div>
            </div>
          </SpotlightCard>

          {/* Medium: top talent */}
          <SpotlightCard
            className="md:col-span-2 transition-transform duration-300 hover:scale-[1.015]"
            spotColor="rgba(6, 182, 212, 0.16)"
          >
            <div className="flex h-full flex-col p-6">
              <div className="flex items-center justify-between">
                <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-white/40">
                  <Users className="h-3.5 w-3.5 text-neon" />
                  Top rated this week
                </p>
                <a
                  href="#jobs"
                  className="text-[12px] font-medium text-brand-soft hover:text-white"
                >
                  View all →
                </a>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {TALENT.slice(0, 3).map((f) => (
                  <div
                    key={f.name}
                    onClick={() => nav("profile", f)}
                    className="cursor-pointer rounded-xl border border-white/8 bg-white/[0.03] p-3.5 transition-colors hover:border-neon/40"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand/50 to-neon/40 font-display text-[11px] font-bold ring-1 ring-white/20">
                        {f.initials}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[12.5px] font-semibold">
                          {f.name}
                        </p>
                        <p className="truncate text-[10.5px] text-white/40">
                          {f.role}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between text-[11px]">
                      <span className="inline-flex items-center gap-1 text-white/60">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        {f.rating}
                      </span>
                      <span className="font-semibold text-mint">{f.rate}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </SpotlightCard>

          {/* Small: live jobs counter */}
          <SpotlightCard className="transition-transform duration-300 hover:scale-[1.02]" spotColor="rgba(16, 185, 129, 0.16)">
            <div className="flex h-full flex-col justify-between p-6">
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-mint/30 bg-mint/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-mint">
                <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-mint" />
                Live
              </span>
              <div>
                <p className="font-display text-4xl font-bold tabular-nums">
                  {openBriefs.toLocaleString("en-US")}
                </p>
                <p className="mt-1 text-[11.5px] text-white/45">
                  briefs open right now
                </p>
              </div>
            </div>
          </SpotlightCard>

          {/* Small: match speed */}
          <SpotlightCard className="transition-transform duration-300 hover:scale-[1.02]">
            <div className="flex h-full flex-col justify-between p-6">
              <Zap className="h-5 w-5 text-brand-soft" />
              <div>
                <p className="font-display text-4xl font-bold">
                  <CountUp to={3.2} decimals={1} suffix="h" />
                </p>
                <p className="mt-1 text-[11.5px] text-white/45">
                  avg. time to AI match
                </p>
              </div>
            </div>
          </SpotlightCard>
        </div>
      </div>
    </section>
  );
}
