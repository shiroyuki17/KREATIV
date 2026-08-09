import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Sparkles,
  ShieldCheck,
  Users,
  AlertCircle,
  FileText,
  Tag,
  Wallet,
  Clock3,
  CalendarClock,
  Eye,
  Loader2,
} from "lucide-react";
import { CL_CATEGORIES } from "../../data/appMock.js";
import { FL_SKILLS } from "../../data/appMock.js";
import { useNav } from "../../nav.jsx";
import { getAccessToken } from "../../lib/authApi.js";
import { createJob, generateJobDraft } from "../../lib/jobsApi.js";
import { fetchFreelancers } from "../../lib/talentApi.js";

const STEPS = ["Basics", "Details", "Review"];

// PostJob's own category labels predate the backend's Jobs schema enum
// (Design/Dev/AI/Motion/Writing/Marketing) — map one onto the other rather
// than reconciling the two taxonomies throughout the UI.
const CATEGORY_TO_API = {
  "Web Development": "Dev",
  "Product Design": "Design",
  "AI & Data": "AI",
  "Motion & 3D": "Motion",
  "Branding": "Design",
  "Mobile Apps": "Dev",
  "Writing & Content": "Writing",
  "Marketing & Growth": "Marketing",
};

const API_TO_CATEGORY = {
  Dev: "Web Development",
  Design: "Product Design",
  AI: "AI & Data",
  Motion: "Motion & 3D",
  Writing: "Writing & Content",
  Marketing: "Marketing & Growth",
};

function Steps({ step }) {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((label, i) => (
        <div key={label} className="flex flex-1 items-center gap-2 last:flex-none">
          <span
            className={
              i < step
                ? "flex h-8 w-8 items-center justify-center rounded-full bg-brand text-[12px] font-bold"
                : i === step
                  ? "flex h-8 w-8 items-center justify-center rounded-full border-2 border-neon bg-neon/10 text-[12px] font-bold text-neon"
                  : "flex h-8 w-8 items-center justify-center rounded-full border border-white/15 text-[12px] font-semibold text-white/35"
            }
          >
            {i < step ? <Check className="h-4 w-4" /> : i + 1}
          </span>
          {i < STEPS.length - 1 && (
            <div className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/8">
              <div
                className="h-full bg-brand transition-all duration-500"
                style={{ width: i < step ? "100%" : "0%" }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function Chip({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-full border border-brand/60 bg-brand/15 px-4 py-2 text-[12.5px] font-semibold text-brand-soft"
          : "rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-[12.5px] font-medium text-white/55 transition-colors hover:border-white/25 hover:text-white"
      }
    >
      {children}
    </button>
  );
}

function FieldLabel({ Icon, children, hint }) {
  return (
    <div className="flex items-center justify-between">
      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-white/40">
        <Icon className="h-3.5 w-3.5 text-brand-soft/70" />
        {children}
      </span>
      {hint && <span className="text-[11px] text-white/30">{hint}</span>}
    </div>
  );
}

const BUDGET_TYPES = [
  { id: "Fixed", Icon: Wallet, desc: "One agreed price for the whole project" },
  { id: "Hourly", Icon: Clock3, desc: "Pay for actual time worked, billed weekly" },
];

const TIMELINE_OPTIONS = ["Less than 1 week", "1–2 weeks", "2–4 weeks", "1–3 months", "3 months+"];

export default function PostJob() {
  const { nav } = useNav();
  const [step, setStep] = useState(0);
  const [published, setPublished] = useState(false);

  const [title, setTitle] = useState("");
  const [cat, setCat] = useState("");
  const [desc, setDesc] = useState("");
  const [skills, setSkills] = useState([]);
  const [type, setType] = useState("Fixed");
  const [budget, setBudget] = useState("");
  const [timeline, setTimeline] = useState("2–4 weeks");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [moderationStatus, setModerationStatus] = useState(null);
  const [matchCount, setMatchCount] = useState(null);

  const [aiIdea, setAiIdea] = useState("");
  const [aiDrafting, setAiDrafting] = useState(false);
  const [aiError, setAiError] = useState("");

  const toggleSkill = (s) =>
    setSkills((a) => (a.includes(s) ? a.filter((x) => x !== s) : [...a, s]));

  async function draftWithAi() {
    const idea = aiIdea.trim();
    if (idea.length < 8) { setAiError("Санаагаа арай дэлгэрэнгүй бичнэ үү"); return; }
    const token = getAccessToken();
    if (!token) { nav("auth", { mode: "login" }); return; }

    setAiDrafting(true);
    setAiError("");
    try {
      const draft = await generateJobDraft(idea, token);
      setTitle(draft.title);
      setCat(API_TO_CATEGORY[draft.category] || "Web Development");
      setDesc(draft.description);
      setSkills(draft.skills.slice(0, 8));
      setType(draft.budgetType === "HOURLY" ? "Hourly" : "Fixed");
      setBudget(draft.budgetType === "HOURLY" ? `$${draft.budgetMax}/hr` : `$${draft.budgetMax.toLocaleString("en-US")}`);
    } catch (err) {
      setAiError(err.message);
    } finally {
      setAiDrafting(false);
    }
  }

  const canNext =
    step === 0 ? title.trim() && cat : step === 1 ? desc.trim() && budget.trim() : true;

  // Зохиомол "7 strong matches" биш — сонгосон ур чадвартай тохирох
  // freelancer-үүдийн бодит тоог review алхамд хүрэхэд татна.
  useEffect(() => {
    if (step !== 2 || skills.length === 0) return;
    fetchFreelancers({ skills: skills.join(","), pageSize: 1 }).then((res) => setMatchCount(res.total)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  async function publish() {
    const token = getAccessToken();
    if (!token) {
      nav("auth", { mode: "login" });
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const amount = parseInt(budget.replace(/[^0-9]/g, ""), 10) || undefined;
      const job = await createJob(
        {
          title,
          description: desc,
          category: CATEGORY_TO_API[cat] || "Dev",
          skills,
          budgetType: type === "Fixed" ? "FIXED" : "HOURLY",
          budgetMin: amount,
          budgetMax: amount,
        },
        token
      );
      setModerationStatus(job.moderationStatus);
      setPublished(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (published) {
    const pendingReview = moderationStatus === "PENDING";
    return (
      <div className="mx-auto flex min-h-screen max-w-xl items-center px-6 py-28">
        <div className="glass w-full rounded-3xl p-10 text-center">
          <span className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2 ${pendingReview ? "border-amber-400 bg-amber-400/10 text-amber-300 shadow-[0_0_44px_rgba(251,191,36,0.35)]" : "border-mint bg-mint/10 text-mint"}`}>
            <Check className="h-9 w-9" />
          </span>
          <h1 className="mt-6 font-display text-2xl font-bold tracking-tight">
            {pendingReview ? "Submitted for review" : "Your brief is live!"}
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-[13.5px] leading-relaxed text-white/50">
            {pendingReview
              ? `“${title}” contains what looks like contact info, so it needs a quick admin check before it goes live (FR-2.3 — spam/leakage protection).`
              : `“${title}” is now visible to vetted specialists. Our AI is already matching it to the best fits.`}
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            {pendingReview ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-[12px] font-semibold text-amber-300">
                <ShieldCheck className="h-3.5 w-3.5" />
                Awaiting admin approval
              </span>
            ) : (
              <>
                {matchCount != null && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-4 py-2 text-[12px] font-semibold text-brand-soft">
                    <Sparkles className="h-3.5 w-3.5" />
                    {matchCount > 0 ? `${matchCount} matching specialist${matchCount === 1 ? "" : "s"} found` : "No matches yet — check back soon"}
                  </span>
                )}
                <span className="inline-flex items-center gap-2 rounded-full border border-mint/30 bg-mint/10 px-4 py-2 text-[12px] font-semibold text-mint">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Escrow ready
                </span>
              </>
            )}
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => nav("find-talent")}
              className="flex-1 rounded-xl bg-brand py-3 text-[13.5px] font-semibold glow-brand transition-shadow"
            >
              Review matches
            </button>
            <button
              onClick={() => nav("client-dashboard")}
              className="flex-1 rounded-xl border border-white/15 bg-white/[0.04] py-3 text-[13.5px] font-semibold text-white/85 transition-colors hover:border-white/25"
            >
              Go to dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 pb-24 pt-8">
      <button
        type="button"
        onClick={() => (step === 0 ? nav("home") : setStep((s) => s - 1))}
        className="inline-flex items-center gap-2 text-[13px] font-medium text-white/50 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        {step === 0 ? "Cancel" : "Back"}
      </button>

      <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-soft">
        — Post a job · Step {step + 1} of 3
      </p>
      <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">
        {step === 0 ? "What do you need done?" : step === 1 ? "Add the details" : "Review your brief"}
      </h1>

      <div className="my-7 max-w-md">
        <Steps step={step} />
      </div>

      <div className="glass rounded-2xl p-7">
        {step === 0 && (
          <div className="space-y-6">
            <div className="rounded-xl border border-brand/25 bg-brand/[0.05] p-4">
              <p className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-brand-soft">
                <Sparkles className="h-3.5 w-3.5" />
                Draft with AI
              </p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-white/50">
                Describe your project in a sentence or two — AI fills in the title, category, description, skills, and a suggested budget below.
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  value={aiIdea}
                  onChange={(e) => setAiIdea(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && draftWithAi()}
                  placeholder="e.g. I need a logo and brand kit for a coffee shop"
                  className="flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[13px] outline-none transition-colors placeholder:text-white/30 focus:border-brand/50"
                />
                <button
                  onClick={draftWithAi}
                  disabled={aiDrafting}
                  className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-[12.5px] font-bold text-fg-1 transition-shadow disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {aiDrafting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  {aiDrafting ? "Drafting…" : "Draft"}
                </button>
              </div>
              {aiError && <p className="mt-2 text-[11.5px] text-red-400">{aiError}</p>}
            </div>

            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
                Project title
              </span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Design a 3D landing page for an AI startup"
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[14px] outline-none transition-colors placeholder:text-white/25 focus:border-brand/50"
              />
            </label>
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
                Category
              </span>
              <div className="mt-3 flex flex-wrap gap-2.5">
                {CL_CATEGORIES.map((c) => (
                  <Chip key={c} active={cat === c} onClick={() => setCat(c)}>
                    {c}
                  </Chip>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-7">
            <label className="block">
              <FieldLabel Icon={FileText} hint={`${desc.length} characters`}>
                Describe the work
              </FieldLabel>
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                rows={5}
                placeholder="Scope, goals, deliverables, and anything a specialist should know…"
                className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[14px] leading-relaxed outline-none transition-colors placeholder:text-white/25 focus:border-brand/50"
              />
            </label>

            <div>
              <FieldLabel Icon={Tag} hint={`${skills.length} selected`}>
                Skills required
              </FieldLabel>
              <div className="mt-3 flex flex-wrap gap-2.5">
                {FL_SKILLS.map((s) => (
                  <Chip key={s} active={skills.includes(s)} onClick={() => toggleSkill(s)}>
                    {s}
                  </Chip>
                ))}
              </div>
            </div>

            <div>
              <FieldLabel Icon={Wallet}>Budget type</FieldLabel>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {BUDGET_TYPES.map(({ id, Icon, desc: d }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setType(id)}
                    className={
                      type === id
                        ? "flex items-start gap-3 rounded-xl border border-brand/60 bg-brand/10 p-4 text-left"
                        : "flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left transition-colors hover:border-white/25"
                    }
                  >
                    <span
                      className={
                        type === id
                          ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/20 text-brand-soft"
                          : "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-white/50"
                      }
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span>
                      <span className={type === id ? "block text-[13.5px] font-semibold text-white" : "block text-[13.5px] font-semibold text-white/80"}>
                        {id}
                      </span>
                      <span className="mt-0.5 block text-[11.5px] leading-snug text-white/45">{d}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block">
                <FieldLabel Icon={Wallet}>{type === "Fixed" ? "Budget" : "Hourly rate"}</FieldLabel>
                <input
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder={type === "Fixed" ? "$5,000" : "$90/hr"}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[14px] outline-none transition-colors placeholder:text-white/25 focus:border-brand/50"
                />
              </label>
              <div className="block">
                <FieldLabel Icon={CalendarClock}>Timeline</FieldLabel>
                <div className="mt-3 flex flex-wrap gap-2">
                  {TIMELINE_OPTIONS.map((o) => (
                    <Chip key={o} active={timeline === o} onClick={() => setTimeline(o)}>
                      {o}
                    </Chip>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-white/35">
              <Eye className="h-3.5 w-3.5" />
              Preview — this is what specialists will see
            </p>

            <div className="rounded-xl border border-white/8 bg-white/[0.03] p-5">
              <p className="text-[10.5px] font-bold uppercase tracking-widest text-brand-soft">
                {cat || "Category"}
              </p>
              <h3 className="mt-2 font-display text-xl font-bold leading-snug">
                {title || "Untitled brief"}
              </h3>
              <p className="mt-3 text-[13.5px] leading-relaxed text-white/60">
                {desc || "No description added."}
              </p>
              {skills.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {skills.map((s) => (
                    <span key={s} className="rounded-full border border-white/10 px-3 py-1 text-[11px] text-white/55">
                      {s}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/8 pt-4">
                <div className="flex items-center gap-2.5 rounded-lg bg-white/[0.03] px-3 py-2.5">
                  <Wallet className="h-4 w-4 shrink-0 text-mint" />
                  <span className="text-[12.5px] text-white/70">
                    {type} · <b className="font-display text-mint">{budget || "—"}</b>
                  </span>
                </div>
                <div className="flex items-center gap-2.5 rounded-lg bg-white/[0.03] px-3 py-2.5">
                  <CalendarClock className="h-4 w-4 shrink-0 text-neon" />
                  <span className="text-[12.5px] text-white/70">{timeline}</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-white/8 bg-white/[0.03] p-5">
              <p className="mb-3.5 text-[11px] font-semibold uppercase tracking-widest text-white/40">
                What happens next
              </p>
              <div className="space-y-3.5">
                <div className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-mint/30 bg-mint/10 text-mint">
                    <ShieldCheck className="h-3.5 w-3.5" />
                  </span>
                  <p className="pt-0.5 text-[12.5px] leading-relaxed text-white/60">
                    You'll fund the first milestone into escrow after choosing a
                    freelancer. Nothing is charged until you hire.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-brand/30 bg-brand/10 text-brand-soft">
                    <Users className="h-3.5 w-3.5" />
                  </span>
                  <p className="pt-0.5 text-[12.5px] leading-relaxed text-white/60">
                    {matchCount != null ? (
                      <>
                        <b className="text-white">{matchCount} specialist{matchCount === 1 ? "" : "s"}</b>{" "}
                        match{matchCount === 1 ? "es" : ""} the skills you picked. Expect proposals within hours.
                      </>
                    ) : (
                      "Your brief will be matched to specialists with the skills you picked."
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <p className="mt-6 flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-[12.5px] font-medium text-red-400">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
          </p>
        )}

        <div className="mt-8 flex items-center justify-between border-t border-white/8 pt-6">
          <button
            type="button"
            onClick={() => (step === 0 ? nav("home") : setStep((s) => s - 1))}
            className="inline-flex items-center gap-2 text-[13px] font-medium text-white/50 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            {step === 0 ? "Cancel" : "Back"}
          </button>
          <button
            type="button"
            onClick={() => (step < 2 ? setStep((s) => s + 1) : publish())}
            disabled={!canNext || submitting}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3 text-[13.5px] font-semibold glow-brand transition-all disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
          >
            {step < 2 ? "Continue" : submitting ? "Publishing…" : "Publish brief"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
