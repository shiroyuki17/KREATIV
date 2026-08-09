import { Flame, Star, BadgeCheck, ArrowRight, Users, Zap } from "lucide-react";
import Avatar from "../ui/Avatar.jsx";
import SpotlightCard from "../fx/SpotlightCard.jsx";
import Magnet from "../fx/Magnet.jsx";
import CountUp from "../fx/CountUp.jsx";
import BlurText from "../fx/BlurText.jsx";
import { useEffect, useState } from "react";
import { useNav } from "../../nav.jsx";
import { useLive } from "../../live.jsx";
import { useHomeJobs, useHomeTalent, toJobCard, toTalentCard } from "../../lib/homeData.js";
import { fetchPublicStats } from "../../lib/analyticsApi.js";

function rateLabel(f) {
  if (f.priceMin == null) return "Rate on request";
  if (f.priceMax && f.priceMax !== f.priceMin) return `$${f.priceMin}–${f.priceMax}/hr`;
  return `$${f.priceMin}/hr`;
}

export default function BentoShowcase() {
  const { nav } = useNav();
  const { openBriefs } = useLive();
  const jobs = useHomeJobs();
  const talent = useHomeTalent();
  const [clients, setClients] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchPublicStats()
      .then((s) => { if (!cancelled) setClients(s.clients); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // "Онцлох" зар: mock-д `featured: true` гэсэн гар хийцийн туг байсан.
  // Бодит өгөгдөлд ийм ойлголт байхгүй тул хамгийн өндөр төсөвтэй нээлттэй
  // зарыг сонгоно — "онцлох" гэдэгт хамгийн ойр, тайлбарлахад ойлгомжтой.
  const featuredRaw = [...(jobs || [])]
    .sort((a, b) => (b.budgetMax ?? b.budgetMin ?? 0) - (a.budgetMax ?? a.budgetMin ?? 0))[0];
  const featured = featuredRaw ? toJobCard(featuredRaw) : null;

  const topTalent = [...(talent || [])]
    .sort((a, b) => (b.ratingAvg || 0) - (a.ratingAvg || 0))
    .slice(0, 3);

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
                {featured ? featured.title : "No open briefs yet"}
              </h3>
              <div className="mt-3 flex items-center gap-2 text-[13px] text-white/55">
                {featured?.client}
                {featured?.verified && <BadgeCheck className="h-4 w-4 text-neon" />}
                {featured?.rating != null && (
                  <span className="inline-flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    {featured.rating.toFixed(1)}
                  </span>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {(featured?.tags || []).slice(0, 5).map((t) => (
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
                    {featured ? `${featured.type} budget` : "Budget"}
                  </p>
                  <p className="font-display text-2xl font-bold text-mint">
                    {featured ? featured.budget : "—"}
                  </p>
                </div>
                <Magnet>
                  <button
                    disabled={!featured}
                    onClick={() => featured && nav("project", featured.raw)}
                    className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-[13px] font-semibold glow-brand transition-shadow"
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
            spotColor="rgba(201, 160, 99, 0.12)"
          >
            <div className="flex h-full flex-col p-6">
              <div className="flex items-center justify-between">
                <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-white/40">
                  <Users className="h-3.5 w-3.5 text-neon" />
                  Top rated this week
                </p>
                <button
                  onClick={() => nav("find-talent")}
                  className="text-[12px] font-medium text-brand-soft hover:text-white"
                >
                  View all →
                </button>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {topTalent.map((raw) => {
                  const f = toTalentCard(raw);
                  return (
                  <div
                    key={f.userId}
                    onClick={() => nav("profile", { userId: f.userId })}
                    className="cursor-pointer rounded-xl border border-white/8 bg-white/[0.03] p-3.5 transition-colors hover:border-neon/40"
                  >
                    <div className="flex items-center gap-2.5">
                      <Avatar src={f.avatarUrl} name={f.name} seed={f.userId} size="h-9 w-9 text-[23px]" />
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
                        {f.rating != null ? f.rating.toFixed(1) : "New"}
                      </span>
                      <span className="font-semibold text-mint">{rateLabel(raw)}</span>
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          </SpotlightCard>

          {/* Small: live jobs counter */}
          <SpotlightCard className="transition-transform duration-300 hover:scale-[1.02]" spotColor="rgba(201, 160, 99, 0.12)">
            <div className="flex h-full flex-col justify-between p-6">
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-mint/30 bg-mint/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-mint">
                <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-mint" />
                Live
              </span>
              <div>
                {/* null = /analytics/public хараахан ирээгүй. Өмнөх кодын
                    адил зохиомол тоо (1284) урьдчилж харуулахгүй — тоо нь
                    ирэхээрээ л гарна. */}
                <p className="font-display text-4xl font-bold tabular-nums">
                  {openBriefs == null ? "—" : openBriefs.toLocaleString("en-US")}
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
                {/* Өмнө нь "3.2h avg. time to AI match" гэсэн зохиомол тоо
                    байв — уг хугацааг хэмждэг ямар ч өгөгдөл системд байхгүй.
                    Бодитоор тоолж чадах зүйлээр сольсон. */}
                <p className="font-display text-4xl font-bold tabular-nums">
                  {clients == null ? "—" : <CountUp to={clients} />}
                </p>
                <p className="mt-1 text-[11.5px] text-white/45">
                  companies hiring
                </p>
              </div>
            </div>
          </SpotlightCard>
        </div>
      </div>
    </section>
  );
}
