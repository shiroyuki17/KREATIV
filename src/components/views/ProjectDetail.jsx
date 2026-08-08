import { useEffect, useState } from "react";
import { ArrowLeft, Star, BadgeCheck, ShieldCheck, Clock, Users, Check, AlertCircle } from "lucide-react";
import SpotlightCard from "../fx/SpotlightCard.jsx";
import Magnet from "../fx/Magnet.jsx";
import { JOBS, MILESTONES } from "../../data/mock.js";
import { useNav } from "../../nav.jsx";
import { fetchJobs } from "../../lib/jobsApi.js";
import { submitProposal } from "../../lib/contractApi.js";
import { getAccessToken } from "../../lib/authApi.js";

function timeAgo(iso) {
  const hours = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// Jobs can arrive here two ways: a real record from the Jobs API (Find Work,
// which is wired to the backend) or a mock record from the still-mock Home
// showcases (BentoShowcase/LiveBriefs/TrendingNow). Normalize both into one
// display shape rather than picking a single source of truth prematurely.
function normalize(job) {
  const isReal = "budgetType" in job;
  if (!isReal) {
    return {
      isReal, id: job.id, cat: job.cat, type: job.type, posted: job.posted,
      clientName: job.client, verified: job.verified, rating: job.rating,
      tags: job.tags, budget: job.budget, proposals: job.proposals,
      description: null,
    };
  }
  return {
    isReal, id: job.id, cat: job.category, type: job.budgetType === "FIXED" ? "Fixed" : "Hourly",
    posted: timeAgo(job.createdAt), clientName: job.client?.name || job.client?.orgName || "Client",
    verified: !!job.client?.verifiedPayer, rating: job.client?.ratingAvg > 0 ? job.client.ratingAvg : null,
    tags: job.skills || [], proposals: null, description: job.description,
    budget: job.budgetMin ? `$${job.budgetMin.toLocaleString("en-US")}${job.budgetType === "HOURLY" ? "/hr" : ""}` : "—",
  };
}

export default function ProjectDetail() {
  const { params, nav } = useNav();
  const raw = params || JOBS[0];
  const job = normalize(raw);
  const [bid, setBid] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [proposalError, setProposalError] = useState("");
  const [proposalWarning, setProposalWarning] = useState(null);
  const [similar, setSimilar] = useState(job.isReal ? [] : JOBS.filter((j) => j.id !== raw.id && j.cat === raw.cat).slice(0, 2));

  const sendProposal = async () => {
    if (!job.isReal) { setSent(true); return; } // mock briefs stay decorative — no real job to attach a proposal to
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
    if (!job.isReal) return;
    fetchJobs({ category: job.cat, pageSize: 3 })
      .then((res) => setSimilar(res.jobs.filter((j) => j.id !== raw.id).slice(0, 2)))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-6 pb-24 pt-8">
      <button
        onClick={() => nav("home")}
        className="inline-flex items-center gap-2 text-[13px] font-medium text-white/50 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to briefs
      </button>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <div className="glass rounded-2xl p-7">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-[10.5px] font-bold uppercase tracking-widest text-brand-soft">
                {job.cat}
              </span>
              <span
                className={
                  job.type === "Fixed"
                    ? "rounded-full border border-mint/30 bg-mint/10 px-3 py-1 text-[10.5px] font-bold uppercase tracking-widest text-mint"
                    : "rounded-full border border-neon/30 bg-neon/10 px-3 py-1 text-[10.5px] font-bold uppercase tracking-widest text-neon"
                }
              >
                {job.type}
              </span>
              <span className="text-[11.5px] text-white/35">Posted {job.posted}</span>
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
                  {job.rating} client rating
                </span>
              )}
            </div>

            <p className="mt-6 text-[14px] leading-relaxed text-white/60">
              {job.description || "We're rebuilding our flagship experience and need a specialist who can own this brief end-to-end. You'll work directly with our product team, ship in weekly milestones, and every payment is escrow-protected from day one. We value taste, velocity, and clear async communication."}
            </p>

            <div className="mt-7">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
                What you'll deliver
              </p>
              <ul className="mt-3 space-y-2.5">
                {["Production-ready implementation with source files", "Weekly milestone demos with staging links", "Documentation and handoff session"].map((d) => (
                  <li key={d} className="flex items-start gap-2.5 text-[13.5px] text-white/70">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-mint" />
                    {d}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-7 flex flex-wrap gap-2">
              {job.tags.map((t) => (
                <span key={t} className="rounded-full border border-white/10 px-3.5 py-1.5 text-[12px] text-white/55">
                  {t}
                </span>
              ))}
            </div>
          </div>

          {!job.isReal && (
            <div className="glass rounded-2xl p-7">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
                Milestone plan
              </p>
              <div className="mt-4 divide-y divide-white/6">
                {MILESTONES.map((m, i) => (
                  <div key={m.label} className="flex items-center justify-between py-3.5">
                    <span className="flex items-center gap-3 text-[13.5px] text-white/75">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full border border-brand/40 bg-brand/10 text-[10.5px] font-bold text-brand-soft">
                        {i + 1}
                      </span>
                      {m.label}
                    </span>
                    <span className="font-display text-[14px] font-bold">{m.amount}</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 inline-flex items-center gap-2 text-[11.5px] text-mint">
                <ShieldCheck className="h-3.5 w-3.5" />
                Funds locked in escrow before each milestone starts
              </p>
            </div>
          )}

          {similar.length > 0 && (
            <div>
              <p className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-white/40">
                Similar briefs
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {similar.map((s) => {
                  const sCat = job.isReal ? s.category : s.cat;
                  const sBudget = job.isReal
                    ? (s.budgetMin ? `$${s.budgetMin.toLocaleString("en-US")}${s.budgetType === "HOURLY" ? "/hr" : ""}` : "—")
                    : s.budget;
                  return (
                    <SpotlightCard key={s.id} onClick={() => nav("project", s)} className="cursor-pointer">
                      <div className="p-5">
                        <p className="text-[10.5px] font-bold uppercase tracking-widest text-brand-soft">{sCat}</p>
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
              {job.type} budget
            </p>
            <p className="mt-2 font-display text-4xl font-bold text-mint">{job.budget}</p>
            <div className="mt-5 space-y-3 border-t border-white/8 pt-5 text-[12.5px] text-white/55">
              {job.proposals != null && (
                <p className="flex items-center gap-2.5">
                  <Users className="h-4 w-4 text-brand-soft" />
                  {job.proposals} proposals so far
                </p>
              )}
              <p className="flex items-center gap-2.5">
                <Clock className="h-4 w-4 text-brand-soft" />
                Avg. response in 3.2 hours
              </p>
              <p className="flex items-center gap-2.5">
                <ShieldCheck className="h-4 w-4 text-mint" />
                Escrow-protected payment
              </p>
            </div>
          </div>

          {(!job.isReal || raw.status === "OPEN") && (
            <div className="glass rounded-2xl p-6">
              <p className="font-display text-[15px] font-semibold">Submit a proposal</p>
              {sent ? (
                <div className="mt-4 space-y-2.5">
                  <div className="rounded-xl border border-mint/30 bg-mint/10 p-4 text-[13px] font-medium text-mint">
                    <span className="inline-flex items-center gap-2">
                      <Check className="h-4 w-4" />
                      Proposal sent — {job.clientName} typically replies within a day.
                    </span>
                  </div>
                  {proposalWarning && (
                    <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-[12px] font-medium text-amber-400">
                      Таны cover note-д {proposalWarning.join(", ")} агуулагдаж байж болзошгүй — гэрээ байгуулагдахаас өмнө холбоо барих мэдээлэл солилцохгүй байхыг зөвлөж байна.
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <label className="mt-4 block text-[11px] font-semibold uppercase tracking-widest text-white/40">
                    Your bid
                  </label>
                  <input
                    value={bid}
                    onChange={(e) => setBid(e.target.value)}
                    placeholder={job.type === "Fixed" ? "$10,500" : "$90/hr"}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[14px] outline-none transition-colors placeholder:text-white/25 focus:border-brand/50"
                  />
                  <label className="mt-4 block text-[11px] font-semibold uppercase tracking-widest text-white/40">
                    Cover note
                  </label>
                  <textarea
                    rows={4}
                    value={coverLetter}
                    onChange={(e) => setCoverLetter(e.target.value)}
                    placeholder="Why you're the right fit…"
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
                      {submitting ? "Илгээж байна…" : "Send Proposal"}
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
