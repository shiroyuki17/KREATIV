import { ArrowLeft, BadgeCheck, Star, MapPin, Globe, MessageSquare, Zap, Sparkles } from "lucide-react";
import Magnet from "../fx/Magnet.jsx";
import CountUp from "../fx/CountUp.jsx";
import { TALENT } from "../../data/mock.js";
import { REVIEWS } from "../../data/appMock.js";
import { useNav } from "../../nav.jsx";

function Stat({ label, value, star }) {
  return (
    <div className="text-center">
      <p className="flex items-center justify-center gap-1 font-display text-[15px] font-bold text-white">
        {star && <Star className="h-3 w-3 fill-amber-400 text-amber-400" />}
        {value}
      </p>
      <p className="text-[9.5px] font-semibold uppercase tracking-wider text-white/35">{label}</p>
    </div>
  );
}

export default function FreelancerProfile() {
  const { params, nav } = useNav();
  const f = params || TALENT[1];
  const topRated = f.rating >= 4.9;

  const stats = [
    { label: "Jobs completed", value: 112 },
    { label: "On-time delivery", value: 98, suffix: "%" },
    { label: "Repeat clients", value: 64, suffix: "%" },
    { label: "Response time", value: 1.4, suffix: "h", decimals: 1 },
  ];

  return (
    <div className="mx-auto max-w-6xl px-6 pb-24 pt-8">
      <button
        onClick={() => nav("home")}
        className="inline-flex items-center gap-2 text-[13px] font-medium text-white/50 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to talent
      </button>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.65fr_1fr]">
        <div className="space-y-6">
          <div className="glass rounded-2xl p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-neon font-display text-lg font-bold ring-1 ring-white/15">
                  {f.initials}
                  {f.available && (
                    <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-[#0a0f0d] bg-mint" />
                  )}
                </span>
                <div>
                  <p className="flex items-center gap-2 font-display text-2xl font-bold">
                    {f.name}
                    {f.verified && <BadgeCheck className="h-5 w-5 text-neon" />}
                  </p>
                  <p className="mt-0.5 text-[13px] text-white/50">{f.role}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="rounded-full border border-white/15 px-5 py-2.5 text-[13px] font-semibold text-white/80 transition-colors hover:border-white/30 hover:text-white">
                  Follow
                </button>
                <button
                  onClick={() => nav("messages")}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand to-brand-soft px-5 py-2.5 text-[13px] font-bold text-ink glow-brand transition-shadow hover:shadow-[0_0_30px_rgba(0,211,149,0.55)]"
                >
                  <MessageSquare className="h-3.5 w-3.5" /> Message
                </button>
              </div>
            </div>

            <p className="mt-4 max-w-xl text-[13.5px] leading-relaxed text-white/60">{f.tagline}</p>

            <div className="mt-5 flex flex-wrap items-center gap-x-7 gap-y-3 border-y border-white/8 py-4">
              <Stat label="Earned" value={f.earned} />
              <Stat label="Hired" value={`${f.hired}x`} />
              <Stat label="Rating" value={f.rating} star />
              <Stat label="Followers" value={f.followers} />
              <div className="ml-auto flex items-center gap-2">
                {topRated && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-brand/40 bg-brand/10 px-2.5 py-1 text-[10.5px] font-bold text-brand-soft">
                    <Sparkles className="h-3 w-3" /> Top Rated
                  </span>
                )}
                <span className="font-display text-[16px] font-bold text-mint">{f.rate}</span>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-4 text-[12.5px] text-white/50">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" /> {f.location}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5" /> English
              </span>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {f.skills.map((s) => (
                <span key={s} className="rounded-full border border-brand/25 bg-brand/8 px-3.5 py-1.5 text-[12px] font-medium text-brand-soft">
                  {s}
                </span>
              ))}
            </div>

            <p className="mt-6 max-w-2xl text-[14px] leading-relaxed text-white/60">
              I help ambitious teams ship polished products fast. Over the past
              8 years I've built design systems, storefronts, and real-time
              dashboards for fintech and AI startups — always milestone-driven,
              always transparent, always on time.
            </p>

            <div className="mt-7 grid grid-cols-2 gap-4 border-t border-white/8 pt-6 sm:grid-cols-4">
              {stats.map((s) => (
                <div key={s.label}>
                  <p className="font-display text-2xl font-bold">
                    <CountUp to={s.value} suffix={s.suffix || ""} decimals={s.decimals || 0} />
                  </p>
                  <p className="mt-1 text-[10.5px] font-medium uppercase tracking-wider text-white/40">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-white/40">
              Selected work
            </p>
            <div className="grid gap-1.5 overflow-hidden rounded-2xl sm:grid-cols-2 lg:grid-cols-4">
              {f.portfolio.map((tile, i) => (
                <div key={i} className={`relative h-40 bg-gradient-to-br ${tile.grad}`}>
                  {tile.label && (
                    <span className="absolute inset-x-3 bottom-3 line-clamp-2 text-[11.5px] font-semibold leading-tight text-white/90">
                      {tile.label}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-white/40">
              Client reviews
            </p>
            <div className="space-y-4">
              {REVIEWS.map((r) => (
                <div key={r.name} className="glass rounded-2xl p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-[13.5px] font-semibold">
                      {r.name}
                      <span className="ml-2 font-normal text-white/40">· {r.project}</span>
                    </p>
                    <span className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-amber-400">
                      <Star className="h-3.5 w-3.5 fill-amber-400" />
                      {r.rating.toFixed(1)}
                    </span>
                  </div>
                  <p className="mt-3 text-[13.5px] leading-relaxed text-white/60">“{r.text}”</p>
                  <p className="mt-3 text-[11px] text-white/30">{r.date}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-5 lg:sticky lg:top-28 lg:self-start">
          <div className="glass rounded-2xl p-6">
            <div className="flex items-baseline justify-between">
              <p className="font-display text-3xl font-bold">{f.rate}</p>
              <span className="inline-flex items-center gap-1.5 text-[11.5px] text-brand-soft">
                <Zap className="h-3.5 w-3.5" />
                98% AI match for your brief
              </span>
            </div>
            <div className="mt-6 space-y-3">
              <Magnet strength={0.15} className="w-full">
                <button className="w-full rounded-xl bg-gradient-to-r from-brand to-brand-soft py-3.5 text-[14px] font-semibold glow-brand transition-shadow hover:shadow-[0_0_44px_rgba(0,211,149,0.6)]">
                  Hire {f.name.split(" ")[0]}
                </button>
              </Magnet>
              <button
                onClick={() => nav("messages")}
                className="glass w-full rounded-xl py-3.5 text-[14px] font-semibold text-white/85 transition-colors hover:border-white/25"
              >
                <span className="inline-flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Message
                </span>
              </button>
            </div>
            <div className="mt-6 space-y-2.5 border-t border-white/8 pt-5 text-[12px] text-white/50">
              <p className="flex justify-between"><span>Response time</span><b className="text-white/80">~1.4 hours</b></p>
              <p className="flex justify-between"><span>Member since</span><b className="text-white/80">2019</b></p>
              <p className="flex justify-between"><span>Last active</span><b className="text-mint">Online now</b></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
