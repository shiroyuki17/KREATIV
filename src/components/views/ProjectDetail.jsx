import { useEffect, useState } from "react";
import { ArrowLeft, Star, BadgeCheck, ShieldCheck, Clock, Users, Check, AlertCircle } from "lucide-react";
import SpotlightCard from "../fx/SpotlightCard.jsx";
import Magnet from "../fx/Magnet.jsx";
import { useNav } from "../../nav.jsx";
import { useT } from "../../i18n.jsx";
import { TIMELINE_LABEL } from "../../lib/timelines.js";
import { fetchJobs, fetchJob } from "../../lib/jobsApi.js";
import { submitProposal } from "../../lib/contractApi.js";
import { getAccessToken } from "../../lib/authApi.js";

function timeAgo(iso, t) {
  const hours = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (hours < 1) return t("fw.justNow");
  if (hours < 24) return t("fw.hoursAgo", { h: hours });
  return t("fw.daysAgo", { d: Math.floor(hours / 24) });
}

// Зар нь Jobs API-аас ирнэ. Өмнө нь нүүр хуудасны mock үзүүлбэрүүдээс ч
// ирдэг байсан тул хоёр өөр хэлбэрийг зэрэг зохицуулдаг байв — тэдгээр
// хэсгүүд бодит өгөгдөлд шилжсэн тул ганц хэлбэр үлдлээ.
function normalize(job, t) {
  return {
    id: job.id, cat: job.category, type: job.budgetType === "FIXED" ? "Fixed" : "Hourly",
    timeline: job.timeline || null,
    posted: timeAgo(job.createdAt, t), clientName: job.client?.name || job.client?.orgName || t("fw.client"),
    verified: !!job.client?.verifiedPayer, rating: job.client?.ratingAvg > 0 ? job.client.ratingAvg : null,
    tags: job.skills || [], proposals: job.proposalCount ?? null, description: job.description,
    budget: job.budgetMin ? `$${job.budgetMin.toLocaleString("en-US")}${job.budgetType === "HOURLY" ? "/hr" : ""}` : "—",
  };
}

export default function ProjectDetail() {
  const t = useT();
  const { params, nav } = useNav();
  // Хуваалцсан линк/дахин ачаалалтаар орж ирэхэд URL-д зөвхөн `id` байна —
  // тэр үед зарыг сервэрээс татна. Жагсаалтаас дарж ирсэн бол бүтэн обьект
  // аль хэдийн params-д байгаа тул нэмэлт хүсэлт явуулахгүй.
  const [fetched, setFetched] = useState(null);
  const raw = params?.title ? params : fetched;
  const job = raw ? normalize(raw, t) : null;

  useEffect(() => {
    if (params?.title || !params?.id) return;
    let cancelled = false;
    fetchJob(params.id)
      .then((j) => { if (!cancelled) setFetched(j); })
      .catch(() => { if (!cancelled) setFetched(null); });
    return () => { cancelled = true; };
  }, [params?.id, params?.title]);
  const [bid, setBid] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [proposalError, setProposalError] = useState("");
  const [proposalWarning, setProposalWarning] = useState(null);
  const [similar, setSimilar] = useState([]);

  const sendProposal = async () => {
    const token = getAccessToken();
    if (!token) { nav("auth"); return; }
    const price = parseInt(bid.replace(/[^0-9]/g, ""), 10);
    if (!price) { setProposalError("Үнийн саналаа тоогоор оруулна уу"); return; }
    if (coverLetter.trim().length < 10) { setProposalError("Cover note дор хаяж 10 тэмдэгт байх ёстой"); return; }
    setSubmitting(true);
    setProposalError("");
    try {
      const res = await submitProposal(raw.id, { price, coverLetter: coverLetter.trim() }, token);
      if (res.leakageWarning) setProposalWarning(res.leakageWarning);
      setSent(true);
    } catch (err) {
      setProposalError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!job) return;
    fetchJobs({ category: job.cat, pageSize: 3 })
      .then((res) => setSimilar(res.jobs.filter((j) => j.id !== raw.id).slice(0, 2)))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Энэ хуудас руу зарын өгөгдөлгүйгээр орж ирж болно (шууд #/project бичих,
  // хуучин хавчуургаар орох). Өмнө нь ийм үед mock зар харуулдаг байсан —
  // байхгүй ажилд өргөдөл гаргах гэж оролдох боломж үүсгэдэг байв.
  if (!job) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center px-6 py-24 text-center">
        <AlertCircle className="h-8 w-8 text-white/30" />
        <h1 className="mt-4 font-display text-xl font-bold">{t("pd.notFound")}</h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-white/50">
          {t("pd.notFoundDesc")}
        </p>
        <button
          onClick={() => nav("find-work")}
          className="mt-6 rounded-xl bg-brand px-6 py-3 text-[13.5px] font-semibold text-ink glow-brand"
        >
          {t("pd.browseOpen")}
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 pb-24 pt-8">
      <button
        onClick={() => nav("home")}
        className="inline-flex items-center gap-2 text-[13px] font-medium text-white/50 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("pd.backToBriefs")}
      </button>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <div className="glass rounded-2xl p-7">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-[10.5px] font-bold uppercase tracking-widest text-brand-soft">
                {t(`cat.${job.cat}`)}
              </span>
              <span
                className={
                  job.type === "Fixed"
                    ? "rounded-full border border-mint/30 bg-mint/10 px-3 py-1 text-[10.5px] font-bold uppercase tracking-widest text-mint"
                    : "rounded-full border border-neon/30 bg-neon/10 px-3 py-1 text-[10.5px] font-bold uppercase tracking-widest text-neon"
                }
              >
                {job.type === "Fixed" ? t("fw.fixed") : t("fw.hourly")}
              </span>
              <span className="text-[11.5px] text-white/35">{t("pd.posted", { when: job.posted })}</span>
            </div>

            <h1 className="mt-5 font-display text-[clamp(1.6rem,3vw,2.3rem)] font-bold leading-tight tracking-tight">
              {raw.title}
            </h1>

            <div className="mt-4 flex items-center gap-2 text-[13px] text-white/55">
              {job.clientName}
              {job.verified && <BadgeCheck className="h-4 w-4 text-neon" />}
              {job.rating && (
                <span className="inline-flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  {job.rating} {t("pd.clientRating")}
                </span>
              )}
            </div>

            <p className="mt-6 text-[14px] leading-relaxed text-white/60">
              {job.description}
            </p>

            {/* Өмнө нь энд "What you'll deliver" гэсэн ГУРВАН ХАТУУ БИЧСЭН мөр
                байв ("Production-ready implementation…" г.м) — зар болгон дээр
                яг ижил, захиалагчийн бичээгүй зүйлийг түүний шаардлага мэт
                харуулдаг байлаа. Оронд нь захиалагчийн ҮНЭХЭЭР сонгосон
                хугацааг харуулна. */}
            {job.timeline && (
              <div className="mt-7">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
                  {t("pd.expectedTimeline")}
                </p>
                <p className="mt-2 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-[13.5px] text-white/75">
                  <Clock className="h-4 w-4 text-brand-soft" />
                  {t(TIMELINE_LABEL[job.timeline] || "pd.expectedTimeline")}
                </p>
              </div>
            )}

            <div className="mt-7 flex flex-wrap gap-2">
              {job.tags.map((t) => (
                <span key={t} className="rounded-full border border-white/10 px-3.5 py-1.5 text-[12px] text-white/55">
                  {t}
                </span>
              ))}
            </div>
          </div>

          {similar.length > 0 && (
            <div>
              <p className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-white/40">
                {t("pd.similarBriefs")}
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {similar.map((s) => {
                  const sCat = s.category;
                  const sBudget = s.budgetMin
                    ? `$${s.budgetMin.toLocaleString("en-US")}${s.budgetType === "HOURLY" ? "/hr" : ""}`
                    : "—";
                  return (
                    <SpotlightCard key={s.id} onClick={() => nav("project", s)} className="cursor-pointer">
                      <div className="p-5">
                        <p className="text-[10.5px] font-bold uppercase tracking-widest text-brand-soft">{t(`cat.${sCat}`)}</p>
                        <p className="mt-2 font-display text-[15px] font-semibold leading-snug">{s.title}</p>
                        <p className="mt-3 text-[13px] font-bold text-mint">{sBudget}</p>
                      </div>
                    </SpotlightCard>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-5 lg:sticky lg:top-28 lg:self-start">
          <div className="glass rounded-2xl p-6">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
              {t("pd.budgetOf", { type: job.type === "Fixed" ? t("fw.fixed") : t("fw.hourly") })}
            </p>
            <p className="mt-2 font-display text-4xl font-bold text-mint">{job.budget}</p>
            <div className="mt-5 space-y-3 border-t border-white/8 pt-5 text-[12.5px] text-white/55">
              {job.proposals != null && (
                <p className="flex items-center gap-2.5">
                  <Users className="h-4 w-4 text-brand-soft" />
                  {t("pd.proposalsSoFar", { count: job.proposals })}
                </p>
              )}
              {/* "Avg. response in 3.2 hours" гэсэн мөр энд байсныг хассан:
                  хариу өгөх хугацааг хэмждэг ямар ч өгөгдөл системд байхгүй
                  атлаа зар болгон дээр ижил тоо гардаг байв. */}
              <p className="flex items-center gap-2.5">
                <ShieldCheck className="h-4 w-4 text-mint" />
                {t("pd.escrowProtected")}
              </p>
            </div>
          </div>

          {raw.status === "OPEN" && (
            <div className="glass rounded-2xl p-6">
              <p className="font-display text-[15px] font-semibold">{t("pd.submitProposal")}</p>
              {sent ? (
                <div className="mt-4 space-y-2.5">
                  <div className="rounded-xl border border-mint/30 bg-mint/10 p-4 text-[13px] font-medium text-mint">
                    <span className="inline-flex items-center gap-2">
                      <Check className="h-4 w-4" />
                      {t("pd.proposalSent", { name: job.clientName })}
                    </span>
                  </div>
                  {proposalWarning && (
                    <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-[12px] font-medium text-amber-400">
                      {t("pd.proposalWarning", { items: proposalWarning.join(", ") })}
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <label className="mt-4 block text-[11px] font-semibold uppercase tracking-widest text-white/40">
                    {t("pd.yourBid")}
                  </label>
                  <input
                    value={bid}
                    onChange={(e) => setBid(e.target.value)}
                    placeholder={job.type === "Fixed" ? "$10,500" : "$90/hr"}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[14px] outline-none transition-colors placeholder:text-white/25 focus:border-brand/50"
                  />
                  <label className="mt-4 block text-[11px] font-semibold uppercase tracking-widest text-white/40">
                    {t("pd.coverNote")}
                  </label>
                  <textarea
                    rows={4}
                    value={coverLetter}
                    onChange={(e) => setCoverLetter(e.target.value)}
                    placeholder={t("pd.coverPlaceholder")}
                    className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[13.5px] outline-none transition-colors placeholder:text-white/25 focus:border-brand/50"
                  />
                  {proposalError && (
                    <p className="mt-3 flex items-center gap-1.5 text-[12px] font-medium text-red-400">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {proposalError}
                    </p>
                  )}
                  <Magnet strength={0.15} className="mt-4 w-full">
                    <button
                      onClick={sendProposal}
                      disabled={submitting}
                      className="w-full rounded-xl bg-brand py-3 text-[13.5px] font-semibold glow-brand transition-shadow disabled:opacity-50"
                    >
                      {submitting ? t("pd.sending") : t("pd.sendProposal")}
                    </button>
                  </Magnet>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
