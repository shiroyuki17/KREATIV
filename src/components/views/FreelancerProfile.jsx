import { useEffect, useState } from "react";
import { ArrowLeft, BadgeCheck, Star, MapPin, Globe, MessageSquare, Zap, Sparkles, Loader2, AlertCircle, Pencil } from "lucide-react";
import Magnet from "../fx/Magnet.jsx";
import { TALENT } from "../../data/mock.js";
import { REVIEWS } from "../../data/appMock.js";
import { useNav } from "../../nav.jsx";
import { avatarSrc } from "../../lib/authApi.js";
import { fetchFreelancerByUserId } from "../../lib/talentApi.js";
import { fetchReviewsFor } from "../../lib/contractApi.js";

function initialsOf(name) {
  return (name || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

function rateLabel(priceMin, priceMax) {
  if (priceMin == null) return "Rate on request";
  if (priceMax && priceMax !== priceMin) return `$${priceMin}–${priceMax}/hr`;
  return `$${priceMin}/hr`;
}

// Real freelancers (fetched from the DB) only carry fields the schema
// actually has — no fake "About" paragraph, no invented jobs-completed/
// on-time/repeat-client stats, no location/member-since, no reviews (no
// review system exists yet). Mock talent (Home's decorative tiles) keeps
// its richer hardcoded shape since that's clearly marketing content, not
// a real person's profile.
function normalizeReal(profile, userId) {
  return {
    isReal: true,
    userId,
    name: profile.user?.name || "Freelancer",
    initials: initialsOf(profile.user?.name),
    avatarUrl: avatarSrc(profile.user?.avatarUrl),
    role: profile.headline || "Freelancer",
    category: profile.category,
    rating: profile.ratingAvg,
    hired: profile.jobsCompleted,
    rate: rateLabel(profile.priceMin, profile.priceMax),
    skills: profile.skills || [],
    tagline: profile.bio,
    portfolio: profile.portfolio || [],
    disputeRate: profile.disputeRate || 0,
    verified: !!profile.verified,
  };
}

export default function FreelancerProfile() {
  const { params, nav, user } = useNav();
  const [real, setReal] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(!!params?.userId);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!params?.userId) return;
    setLoading(true);
    setError("");
    fetchFreelancerByUserId(params.userId)
      .then(setReal)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    fetchReviewsFor(params.userId).then((r) => setReviews(r.reviews)).catch(() => {});
  }, [params?.userId]);

  if (params?.userId) {
    if (loading) {
      return (
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-brand-soft" />
        </div>
      );
    }
    if (error || !real) {
      // Client-only акаунт өөрийн "View profile" дарахад freelancer профайл
      // байхгүй тул 404 ирдэг — "олдсонгүй" гэсэн ерөнхий алдаа биш, яг юу
      // болсныг тайлбарлаж Settings рүү чиглүүлнэ.
      const isOwn = user?.id === params.userId;
      return (
        <div className="mx-auto max-w-xl px-6 pb-24 pt-20 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-red-400" />
          <p className="mt-4 text-[14px] text-white/60">
            {isOwn ? "Танд freelancer профайл байхгүй байна — та зөвхөн client акаунттай байж болзошгүй." : (error || "Профайл олдсонгүй.")}
          </p>
          <button
            onClick={() => nav(isOwn ? "settings" : "find-talent")}
            className="mt-5 text-[13px] font-semibold text-brand-soft hover:text-white"
          >
            {isOwn ? "← Тохиргоо руу очих" : "← Back to talent"}
          </button>
        </div>
      );
    }
  }

  const isReal = !!params?.userId;
  const f = isReal ? normalizeReal(real, params.userId) : (params || TALENT[1]);
  const topRated = isReal ? f.rating >= 4.8 : f.rating >= 4.9;
  const isNew = isReal && f.rating === 0 && f.hired === 0;
  const isOwn = isReal && user?.id === f.userId;

  const stats = [
    { label: "Jobs completed", value: 112 },
    { label: "On-time delivery", value: 98, suffix: "%" },
    { label: "Repeat clients", value: 64, suffix: "%" },
    { label: "Response time", value: 1.4, suffix: "h", decimals: 1 },
  ];

  return (
    <div className="mx-auto max-w-6xl px-6 pb-24 pt-8">
      <button
        onClick={() => nav(isReal ? "find-talent" : "home")}
        className="inline-flex items-center gap-2 text-[13px] font-medium text-white/50 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to talent
      </button>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.65fr]">
        {/* Identity + hire — left column, sticky */}
        <div className="space-y-5 lg:sticky lg:top-28 lg:self-start">
          <div className="glass rounded-2xl p-7">
            <div className="flex flex-col items-center text-center">
              <span className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand font-display text-xl font-bold ring-1 ring-white/15">
                {isReal && f.avatarUrl ? (
                  <img src={f.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  f.initials
                )}
                {!isReal && f.available && (
                  <span className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full border-2 border-[#1b1d20] bg-mint" />
                )}
              </span>
              <p className="mt-4 flex items-center gap-2 font-display text-xl font-bold">
                {f.name}
                {f.verified && <BadgeCheck className="h-5 w-5 text-neon" />}
              </p>
              <p className="mt-0.5 text-[13px] text-white/50">{f.role}</p>

              <div className="mt-3 flex items-center gap-2">
                {isNew && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-neon/40 bg-neon/10 px-2.5 py-1 text-[10.5px] font-bold text-neon">
                    New on KREATIV
                  </span>
                )}
                {topRated && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-brand/40 bg-brand/10 px-2.5 py-1 text-[10.5px] font-bold text-brand-soft">
                    <Sparkles className="h-3 w-3" /> Top Rated
                  </span>
                )}
                {(!isReal || f.rating > 0) && (
                  <span className="inline-flex items-center gap-1 text-[12.5px] font-bold text-amber-400">
                    <Star className="h-3.5 w-3.5 fill-amber-400" /> {isReal ? f.rating.toFixed(1) : f.rating}
                  </span>
                )}
              </div>

              <p className="mt-4 font-display text-3xl font-bold">{f.rate}</p>
              {!isReal && (
                <span className="mt-1 inline-flex items-center gap-1.5 text-[11.5px] text-brand-soft">
                  <Zap className="h-3.5 w-3.5" />
                  98% AI match for your brief
                </span>
              )}
              {isOwn && (
                <span className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.03] px-2.5 py-1 text-[10.5px] font-semibold text-white/50">
                  This is how clients see you
                </span>
              )}
            </div>

            <div className="mt-6 space-y-3">
              {isOwn ? (
                <Magnet strength={0.15} className="w-full">
                  <button
                    onClick={() => nav("settings")}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3.5 text-[14px] font-semibold glow-brand transition-shadow"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit profile
                  </button>
                </Magnet>
              ) : (
                <>
                  <Magnet strength={0.15} className="w-full">
                    <button className="w-full rounded-xl bg-brand py-3.5 text-[14px] font-semibold glow-brand transition-shadow">
                      Hire {f.name.split(" ")[0]}
                    </button>
                  </Magnet>
                  <div className="flex gap-2">
                    <button
                      onClick={() => nav("messages", isReal ? { withUserId: f.userId } : undefined)}
                      className="glass inline-flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-[13.5px] font-semibold text-white/85 transition-colors hover:border-white/25"
                    >
                      <MessageSquare className="h-4 w-4" />
                      Message
                    </button>
                    <button className="glass rounded-xl px-4 py-3 text-[13.5px] font-semibold text-white/70 transition-colors hover:border-white/25 hover:text-white">
                      Follow
                    </button>
                  </div>
                </>
              )}
            </div>

            {!isReal && (
              <div className="mt-6 flex flex-wrap items-center justify-center gap-4 border-t border-white/8 pt-5 text-[12.5px] text-white/50">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" /> {f.location}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5" /> English
                </span>
              </div>
            )}

            <div className="mt-5 space-y-2.5 border-t border-white/8 pt-5 text-[12px] text-white/50">
              {isReal ? (
                <>
                  <p className="flex justify-between"><span>Jobs completed</span><b className="text-white/80">{f.hired}</b></p>
                  {f.disputeRate > 0 && (
                    <p className="flex justify-between"><span>Dispute rate</span><b className={f.disputeRate > 20 ? "text-red-400" : "text-amber-300"}>{f.disputeRate}%</b></p>
                  )}
                </>
              ) : (
                <>
                  <p className="flex justify-between"><span>Response time</span><b className="text-white/80">~1.4 hours</b></p>
                  <p className="flex justify-between"><span>Member since</span><b className="text-white/80">2019</b></p>
                  <p className="flex justify-between"><span>Last active</span><b className="text-mint">Online now</b></p>
                  <p className="flex justify-between"><span>Followers</span><b className="text-white/80">{f.followers}</b></p>
                  <p className="flex justify-between"><span>Hired</span><b className="text-white/80">{f.hired}x</b></p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Portfolio, skills, reviews — right column */}
        <div className="space-y-6">
          <div className="glass rounded-2xl p-7">
            {f.tagline && <p className="max-w-2xl text-[13.5px] leading-relaxed text-white/60">{f.tagline}</p>}

            <div className="mt-5 flex flex-wrap gap-2">
              {f.skills.map((s) => (
                <span key={s} className="rounded-full border border-brand/25 bg-brand/8 px-3.5 py-1.5 text-[12px] font-medium text-brand-soft">
                  {s}
                </span>
              ))}
            </div>

            {!isReal && (
              <>
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
                        {s.value}{s.suffix || ""}
                      </p>
                      <p className="mt-1 text-[10.5px] font-medium uppercase tracking-wider text-white/40">
                        {s.label}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div>
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-white/40">
              Selected work
            </p>
            {isReal ? (
              f.portfolio.length > 0 ? (
                <div className="space-y-2.5">
                  {f.portfolio.map((p) => (
                    <div key={p.id} className="glass rounded-2xl p-5">
                      <p className="text-[14px] font-semibold">{p.title}</p>
                      {p.description && <p className="mt-1 text-[12.5px] text-white/50">{p.description}</p>}
                      {p.link && (
                        <a href={p.link} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-[12px] font-semibold text-brand-soft hover:text-white">
                          {p.link} →
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="glass rounded-2xl p-6 text-[13px] text-white/45">No portfolio items yet.</p>
              )
            ) : (
              <div className="grid gap-1.5 overflow-hidden rounded-2xl sm:grid-cols-2 lg:grid-cols-4">
                {f.portfolio.map((tile, i) => (
                  <div key={i} className={`relative h-40 bg-gradient-to-br ${tile.grad} transition-transform duration-300 hover:scale-[1.02]`}>
                    {tile.label && (
                      <span className="absolute inset-x-3 bottom-3 line-clamp-2 text-[11.5px] font-semibold leading-tight text-white/90">
                        {tile.label}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {isReal ? (
            <div>
              <p className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-white/40">
                Client reviews
              </p>
              {reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviews.map((r) => (
                    <div key={r.id} className="glass rounded-2xl p-6 transition-transform duration-300 hover:scale-[1.01]">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-[13.5px] font-semibold">
                          {r.reviewerName}
                          {r.jobTitle && <span className="ml-2 font-normal text-white/40">· {r.jobTitle}</span>}
                        </p>
                        <span className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-amber-400">
                          <Star className="h-3.5 w-3.5 fill-amber-400" />
                          {r.stars.toFixed(1)}
                        </span>
                      </div>
                      {r.comment && <p className="mt-3 text-[13.5px] leading-relaxed text-white/60">"{r.comment}"</p>}
                      <p className="mt-3 text-[11px] text-white/30">{new Date(r.createdAt).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="glass rounded-2xl p-6 text-[13px] text-white/45">Одоогоор review алга.</p>
              )}
            </div>
          ) : (
            <div>
              <p className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-white/40">
                Client reviews
              </p>
              <div className="space-y-4">
                {REVIEWS.map((r) => (
                  <div key={r.name} className="glass rounded-2xl p-6 transition-transform duration-300 hover:scale-[1.01]">
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
                    <p className="mt-3 text-[13.5px] leading-relaxed text-white/60">"{r.text}"</p>
                    <p className="mt-3 text-[11px] text-white/30">{r.date}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
