import { useEffect, useState } from "react";
import { ArrowLeft, BadgeCheck, Star, MessageSquare, Sparkles, Loader2, AlertCircle, Pencil, Image as ImageIcon } from "lucide-react";
import Magnet from "../fx/Magnet.jsx";
import { useNav } from "../../nav.jsx";
import { avatarSrc } from "../../lib/authApi.js";
import { fetchFreelancerByUserId } from "../../lib/talentApi.js";
import { fetchReviewsFor } from "../../lib/contractApi.js";

// StandoutWork.jsx-ийн CAT_GRAD-тай ижил санаа — категори бүр өөрийн өнгөтэй
// тул декоратив cover зурган оронд категориороо л ялгаатай харагдана.
const CAT_COVER = {
  Design: "from-brand/60 via-brand-soft/25 to-transparent",
  Dev: "from-neon/55 via-brand/25 to-transparent",
  AI: "from-violet/55 via-violet-soft/20 to-transparent",
  Motion: "from-mint/50 via-neon/20 to-transparent",
  Writing: "from-amber-400/45 via-rose-400/15 to-transparent",
  Marketing: "from-rose-400/45 via-violet/15 to-transparent",
};

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
  const [activeTab, setActiveTab] = useState("about");

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

  // Профайл руу орох бүх зам userId дамжуулдаг (FindTalent, BentoShowcase,
  // StandoutWork, dashboard, mobile tab). Өмнө нь userId байхгүй үед mock
  // хүн (TALENT[1]) харуулдаг байсан — DB-д байхгүй хүний профайл, зохиомол
  // "112 ажил, 98% цагтаа, 64% давтан захиалагч" гэсэн тоонуудтай.
  if (!params?.userId) {
    return (
      <div className="mx-auto max-w-xl px-6 pb-24 pt-20 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-white/30" />
        <p className="mt-4 text-[14px] text-white/60">Профайл сонгогдоогүй байна.</p>
        <button onClick={() => nav("find-talent")} className="mt-5 text-[13px] font-semibold text-brand-soft hover:text-white">
          ← Back to talent
        </button>
      </div>
    );
  }

  {
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

  const f = normalizeReal(real, params.userId);
  const topRated = f.rating >= 4.8;
  const isNew = f.rating === 0 && f.hired === 0;
  const isOwn = user?.id === f.userId;
  const cover = CAT_COVER[f.category] || CAT_COVER.Dev;

  return (
    <div className="mx-auto max-w-6xl px-6 pb-24 pt-8">
      <button
        onClick={() => nav("find-talent")}
        className="inline-flex items-center gap-2 text-[13px] font-medium text-white/50 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to talent
      </button>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.65fr]">
        {/* Identity + hire — left column, sticky */}
        <div className="space-y-5 lg:sticky lg:top-28 lg:self-start">
          <div className="glass overflow-hidden rounded-2xl">
            {/* Category-тонтой cover — декоратив зураггүйгээр л профайлыг тодруулна. */}
            <div className={`h-24 bg-gradient-to-br ${cover}`} />
            <div className="-mt-12 flex flex-col items-center px-7 text-center">
              <span className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand font-display text-2xl font-bold ring-4 ring-panel">
                {f.avatarUrl ? (
                  <img src={f.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  f.initials
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
                {f.rating > 0 && (
                  <span className="inline-flex items-center gap-1 text-[12.5px] font-bold text-amber-400">
                    <Star className="h-3.5 w-3.5 fill-amber-400" /> {f.rating.toFixed(1)}
                  </span>
                )}
              </div>

              <p className="mt-4 font-display text-3xl font-bold">{f.rate}</p>
              {isOwn && (
                <span className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.03] px-2.5 py-1 text-[10.5px] font-semibold text-white/50">
                  This is how clients see you
                </span>
              )}
            </div>

            <div className="mt-6 space-y-3 px-7">
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
                      onClick={() => nav("messages", { withUserId: f.userId })}
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


            <div className="mt-5 space-y-2.5 border-t border-white/8 px-7 pb-7 pt-5 text-[12px] text-white/50">
              <p className="flex justify-between"><span>Jobs completed</span><b className="text-white/80">{f.hired}</b></p>
              {f.disputeRate > 0 && (
                <p className="flex justify-between"><span>Dispute rate</span><b className={f.disputeRate > 20 ? "text-red-400" : "text-amber-300"}>{f.disputeRate}%</b></p>
              )}
            </div>
          </div>
        </div>

        {/* Portfolio, skills, reviews — right column, tabbed */}
        <div>
          <div className="flex gap-2 border-b border-white/8">
            {[
              { id: "about", label: "About" },
              { id: "portfolio", label: `Portfolio${f.portfolio.length ? ` (${f.portfolio.length})` : ""}` },
              { id: "reviews", label: `Reviews${reviews.length ? ` (${reviews.length})` : ""}` },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`relative px-4 py-3 text-[13px] font-semibold transition-colors ${
                  activeTab === t.id ? "text-white" : "text-white/45 hover:text-white/70"
                }`}
              >
                {t.label}
                {activeTab === t.id && (
                  <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand" />
                )}
              </button>
            ))}
          </div>

          <div className="mt-6">
            {activeTab === "about" && (
              <div className="glass rounded-2xl p-7">
                {f.tagline ? (
                  <p className="max-w-2xl text-[13.5px] leading-relaxed text-white/60">{f.tagline}</p>
                ) : (
                  <p className="text-[13px] text-white/40">No bio yet.</p>
                )}
                {f.skills.length > 0 && (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {f.skills.map((s) => (
                      <span key={s} className="rounded-full border border-brand/25 bg-brand/8 px-3.5 py-1.5 text-[12px] font-medium text-brand-soft">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "portfolio" && (
              f.portfolio.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {f.portfolio.map((p) => (
                    <a
                      key={p.id}
                      href={p.link || undefined}
                      target={p.link ? "_blank" : undefined}
                      rel={p.link ? "noopener noreferrer" : undefined}
                      className={`group overflow-hidden rounded-2xl border border-white/8 bg-white/[0.03] transition-colors ${p.link ? "hover:border-brand/40" : ""}`}
                    >
                      {p.images?.[0] ? (
                        <img src={avatarSrc(p.images[0])} alt="" className="h-44 w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                      ) : (
                        <div className="flex h-44 w-full items-center justify-center bg-white/[0.02] text-white/15">
                          <ImageIcon className="h-9 w-9" />
                        </div>
                      )}
                      <div className="p-4">
                        <p className="text-[14px] font-semibold">{p.title}</p>
                        {p.description && <p className="mt-1 line-clamp-2 text-[12.5px] text-white/50">{p.description}</p>}
                        {p.link && (
                          <p className="mt-2 text-[12px] font-semibold text-brand-soft group-hover:text-white">View project →</p>
                        )}
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="glass rounded-2xl p-6 text-[13px] text-white/45">No portfolio items yet.</p>
              )
            )}

            {activeTab === "reviews" && (
              reviews.length > 0 ? (
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
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
