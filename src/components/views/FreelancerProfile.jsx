import { useEffect, useState } from "react";
import { ArrowLeft, BadgeCheck, Star, MessageSquare, Sparkles, Loader2, AlertCircle, Pencil, Image as ImageIcon, ShieldCheck } from "lucide-react";
import Magnet from "../fx/Magnet.jsx";
import { useNav } from "../../nav.jsx";
import { avatarSrc } from "../../lib/authApi.js";
import { fetchFreelancerByUserId, fetchFreelancerByUsername, fetchFreelancerStats, recordProfileView, followUser, unfollowUser, fetchMyFollowing } from "../../lib/talentApi.js";
import { fetchReviewsFor } from "../../lib/contractApi.js";
import { fetchGigs } from "../../lib/gigApi.js";

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

// Ажил авах боломж — захиалагчийн хамгийн эхэнд хайдаг дохио.
const AVAILABILITY = {
  OPEN: { label: "Ажил авч байна", cls: "border-mint/35 bg-mint/10 text-mint", dot: "bg-mint" },
  BUSY: { label: "Ачаалалтай", cls: "border-amber-400/35 bg-amber-400/10 text-amber-300", dot: "bg-amber-300" },
  CLOSED: { label: "Ажил авахгүй", cls: "border-white/15 bg-white/[0.05] text-white/45", dot: "bg-white/40" },
};

function AvailabilityBadge({ value }) {
  const a = AVAILABILITY[value];
  if (!a) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold ${a.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${a.dot} ${value === "OPEN" ? "animate-pulse" : ""}`} />
      {a.label}
    </span>
  );
}

function StatTile({ label, value }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
      <p className="font-display text-[15px] font-bold text-white">{value}</p>
      <p className="mt-0.5 text-[10px] leading-tight text-white/40">{label}</p>
    </div>
  );
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
  const [loading, setLoading] = useState(!!(params?.userId || params?.username));
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("about");
  const [isFollowing, setIsFollowing] = useState(false);
  const [stats, setStats] = useState(null);
  const [gigs, setGigs] = useState([]);

  // Хоёр замаар орж ирж болно: жагсаалтаас дарж (userId) эсвэл хуваалцсан
  // богино хаягаар (/#/u/bat-erdene → username).
  useEffect(() => {
    if (!params?.userId && !params?.username) return;
    setLoading(true);
    setError("");
    const load = params.username
      ? fetchFreelancerByUsername(params.username)
      : fetchFreelancerByUserId(params.userId);

    load
      .then((profile) => {
        setReal(profile);
        // Дагасан эсэх/сэтгэгдлийг ЗӨВХӨН профайл ирсний дараа татна —
        // username-ээр орж ирэхэд userId нь эхэндээ мэдэгдэхгүй.
        const uid = profile?.userId;
        if (!uid) return;
        fetchReviewsFor(uid).then((r) => setReviews(r.reviews)).catch(() => {});
        fetchFreelancerStats(uid).then(setStats).catch(() => {});
        fetchGigs({ freelancerUserId: uid, pageSize: 12 }).then((r) => setGigs(r.gigs || [])).catch(() => {});
        // Үзэлт бүртгэнэ. Сервер өөрөө өөрийн профайл болон 30 минутын
        // доторх давхардлыг таслах тул энд шалгах шаардлагагүй.
        recordProfileView(uid).catch(() => {});
        // Нэвтрээгүй хүнд дагах товч ажиллахгүй ч хуудас хэвийн харагдана.
        fetchMyFollowing()
          .then((res) => setIsFollowing((res.following || []).includes(uid)))
          .catch(() => {});
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [params?.userId, params?.username]);

  // Хуудсын гарчиг/тайлбарыг тухайн хүнээр солино. Facebook-ийн OG картыг
  // энэ шийдэхгүй (crawler нь JS ажиллуулдаггүй) ч browser-ийн таб, хавчуурга,
  // мөн JS гүйцэтгэдэг индексжүүлэгчид (Google) зөв гарчиг харна.
  useEffect(() => {
    const previous = document.title;
    if (real) {
      const who = real.user?.name || "Freelancer";
      document.title = real.headline ? `${who} — ${real.headline} · KREATIV` : `${who} · KREATIV`;
      const desc = document.querySelector('meta[name="description"]');
      if (desc && real.bio) desc.setAttribute("content", real.bio.slice(0, 160));
    }
    return () => { document.title = previous; };
  }, [real]);

  // Нэвтрээгүй зочин профайл үзэж болно (нийтэд нээлттэй) ч дагах/бичих
  // нь акаунт шаардана — 401 харуулахын оронд нэвтрэх рүү чиглүүлнэ.
  const requireLogin = () => { nav("auth"); };

  // Optimistic — сервер унавал төлөвийг эргүүлж буцаана.
  async function toggleFollow() {
    if (!user) return requireLogin();
    const was = isFollowing;
    setIsFollowing(!was);
    try {
      const uid = real?.userId || params.userId;
      if (was) await unfollowUser(uid);
      else await followUser(uid);
    } catch (err) {
      setIsFollowing(was);
      setError(err.message);
    }
  }

  // Профайл руу орох бүх зам userId дамжуулдаг (FindTalent, BentoShowcase,
  // StandoutWork, dashboard, mobile tab). Өмнө нь userId байхгүй үед mock
  // хүн (TALENT[1]) харуулдаг байсан — DB-д байхгүй хүний профайл, зохиомол
  // "112 ажил, 98% цагтаа, 64% давтан захиалагч" гэсэн тоонуудтай.
  if (!params?.userId && !params?.username) {
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
      const isOwn = !!params.userId && user?.id === params.userId;
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

  // username-ээр орж ирэхэд userId нь зөвхөн серверийн хариултад байна.
  const f = normalizeReal(real, real.userId || params.userId);
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

              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                <AvailabilityBadge value={real.availability} />
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
                    {/* Өмнө нь onClick огт байхгүй байсан — хуудасны ГОЛ
                        товч дарахад юу ч болдоггүй байв. Хөлслөх урсгал нь
                        зар нийтлэхээс эхэлдэг тул тийш чиглүүлнэ. */}
                    <button
                      onClick={() => (user ? nav("post-job") : requireLogin())}
                      className="w-full rounded-xl bg-brand py-3.5 text-[14px] font-semibold glow-brand transition-shadow"
                    >
                      Hire {f.name.split(" ")[0]}
                    </button>
                  </Magnet>
                  <div className="flex gap-2">
                    <button
                      onClick={() => (user ? nav("messages", { withUserId: f.userId }) : requireLogin())}
                      className="glass inline-flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-[13.5px] font-semibold text-white/85 transition-colors hover:border-white/25"
                    >
                      <MessageSquare className="h-4 w-4" />
                      Message
                    </button>
                    <button
                      onClick={toggleFollow}
                      className={
                        isFollowing
                          ? "rounded-xl border border-brand/50 bg-brand/15 px-4 py-3 text-[13.5px] font-semibold text-brand-soft transition-colors"
                          : "glass rounded-xl px-4 py-3 text-[13.5px] font-semibold text-white/70 transition-colors hover:border-white/25 hover:text-white"
                      }
                    >
                      {isFollowing ? "Following" : "Follow"}
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

            {/* Escrow-оор баталгаажсан тоонууд. Contra/Fiverr дээр ижил
                төстэй тоог хүн ӨӨРӨӨ бичдэг; эдгээр нь гүйлгээ, гэрээний
                бодит мөрөөс тоологддог тул зохиох боломжгүй.
                Бүх тоо 0 бол огт харуулахгүй — шинэ хүнд тэгийн эгнээ нь
                итгэл нэмэхгүй, харин ч эсрэгээрээ. */}
            {stats && (stats.escrowPaidOut > 0 || stats.contractsTotal > 0) && (
              <div className="border-t border-white/8 px-7 pb-7 pt-5">
                <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-mint">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Escrow-оор баталгаажсан
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2.5">
                  <StatTile label="Escrow-оор дамжсан" value={`$${stats.escrowPaidOut.toLocaleString("en-US")}`} />
                  <StatTile label="Батлагдсан milestone" value={stats.milestonesApproved} />
                  <StatTile label="Захиалагч" value={stats.clientsTotal} />
                  <StatTile label="Давтан захиалагч" value={stats.repeatClients} />
                </div>
                <p className="mt-2.5 text-[10.5px] leading-relaxed text-white/30">
                  Эдгээр тоог системд бүртгэгдсэн гэрээ, escrow гүйлгээнээс шууд
                  тооцсон — гараар оруулах боломжгүй.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Portfolio, skills, reviews — right column, tabbed */}
        <div>
          <div className="flex gap-2 border-b border-white/8">
            {[
              { id: "about", label: "About" },
              // Contra дээр service бол профайлын гол хэсэг — өмнө нь манай
              // Gig-үүд зөвхөн Find Services дээр л харагддаг тул хүн
              // профайл руу ороод юу захиалж болохыг огт мэдэхгүй байв.
              ...(gigs.length ? [{ id: "services", label: `Services (${gigs.length})` }] : []),
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

            {activeTab === "services" && (
              <div className="grid gap-4 sm:grid-cols-2">
                {gigs.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => nav("gig", { id: g.id })}
                    className="group overflow-hidden rounded-2xl border border-white/8 bg-white/[0.03] text-left transition-colors hover:border-brand/40"
                  >
                    {g.images?.[0] ? (
                      <img src={avatarSrc(g.images[0])} alt="" className="h-40 w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                    ) : (
                      <div className="flex h-40 w-full items-center justify-center bg-white/[0.02] text-white/15">
                        <ImageIcon className="h-8 w-8" />
                      </div>
                    )}
                    <div className="p-4">
                      <p className="line-clamp-2 text-[13.5px] font-semibold leading-snug">{g.title}</p>
                      <div className="mt-3 flex items-center justify-between border-t border-white/8 pt-3">
                        <span className="text-[11px] text-white/40">{g.deliveryDays} өдөр</span>
                        <span className="font-display text-[15px] font-bold text-mint">${g.price}</span>
                      </div>
                      {g.ordersCount > 0 && (
                        <p className="mt-1.5 text-[10.5px] text-white/35">{g.ordersCount} захиалагдсан</p>
                      )}
                    </div>
                  </button>
                ))}
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
                      {/* Нүүр зургийг эзэн нь сонгоно (coverIndex) — өмнө нь
                          үргэлж эхний зураг байсан. */}
                      {(() => {
                        const cover = p.images?.[p.coverIndex ?? 0] || p.images?.[0];
                        return cover ? (
                          <img src={avatarSrc(cover)} alt="" className="h-44 w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                        ) : (
                          <div className="flex h-44 w-full items-center justify-center bg-white/[0.02] text-white/15">
                            <ImageIcon className="h-9 w-9" />
                          </div>
                        );
                      })()}
                      <div className="p-4">
                        <p className="text-[14px] font-semibold">{p.title}</p>
                        {/* Үр дүн нь "юу хийсэн"-ээс илүү хүчтэй дохио тул
                            тайлбараас өмнө, тодруулж харуулна. */}
                        {p.outcome && (
                          <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg border border-mint/25 bg-mint/10 px-2.5 py-1 text-[11.5px] font-semibold text-mint">
                            {p.outcome}
                          </p>
                        )}
                        {p.description && <p className="mt-1.5 line-clamp-2 text-[12.5px] text-white/50">{p.description}</p>}
                        <div className="mt-2 flex flex-wrap items-center gap-3">
                          {p.link && (
                            <span className="text-[12px] font-semibold text-brand-soft group-hover:text-white">View project →</span>
                          )}
                          {p.embedUrl && (
                            <span className="text-[11.5px] text-white/35">Embed бий</span>
                          )}
                          {p.images?.length > 1 && (
                            <span className="text-[11.5px] text-white/35">{p.images.length} зураг</span>
                          )}
                        </div>
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
