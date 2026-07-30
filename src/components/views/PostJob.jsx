import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Sparkles,
  ShieldCheck,
  Users,
  AlertCircle,
} from "lucide-react";
import { CL_CATEGORIES } from "../../data/appMock.js";
import { FL_SKILLS } from "../../data/appMock.js";
import { useNav } from "../../nav.jsx";
import { getAccessToken } from "../../lib/authApi.js";
import { createJob } from "../../lib/jobsApi.js";

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
};

function Steps({ step }) {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((label, i) => (
        <div key={label} className="flex flex-1 items-center gap-2 last:flex-none">
          <span
            className={
              i < step
                ? "flex h-8 w-8 items-center justify-center rounded-full bg-brand text-[12px] font-bold shadow-[0_0_16px_rgba(0,211,149,0.6)]"
                : i === step
                  ? "flex h-8 w-8 items-center justify-center rounded-full border-2 border-neon bg-neon/10 text-[12px] font-bold text-neon shadow-[0_0_18px_rgba(6,182,212,0.5)]"
                  : "flex h-8 w-8 items-center justify-center rounded-full border border-white/15 text-[12px] font-semibold text-white/35"
            }
          >
            {i < step ? <Check className="h-4 w-4" /> : i + 1}
          </span>
          {i < STEPS.length - 1 && (
            <div className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/8">
              <div
                className="h-full bg-gradient-to-r from-brand to-neon transition-all duration-500"
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
      onClick={onClick}
      className={
        active
          ? "rounded-full border border-brand/60 bg-brand/15 px-4 py-2 text-[12.5px] font-semibold text-brand-soft shadow-[0_0_16px_rgba(0,211,149,0.25)]"
          : "rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-[12.5px] font-medium text-white/55 transition-colors hover:border-white/25 hover:text-white"
      }
    >
      {children}
    </button>
  );
}

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

  const toggleSkill = (s) =>
    setSkills((a) => (a.includes(s) ? a.filter((x) => x !== s) : [...a, s]));

  const canNext =
    step === 0 ? title.trim() && cat : step === 1 ? desc.trim() && budget.trim() : true;

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
      await createJob(
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
      setPublished(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (published) {
    return (
      <div className="mx-auto flex min-h-screen max-w-xl items-center px-6 py-28">
        <div className="glass w-full rounded-3xl p-10 text-center">
          <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2 border-mint bg-mint/10 text-mint shadow-[0_0_44px_rgba(16,185,129,0.45)]">
            <Check className="h-9 w-9" />
          </span>
          <h1 className="mt-6 font-display text-2xl font-bold tracking-tight">
            Your brief is live!
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-[13.5px] leading-relaxed text-white/50">
            “{title}” is now visible to vetted specialists. Our AI is already
            matching it to the best fits.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-4 py-2 text-[12px] font-semibold text-brand-soft">
              <Sparkles className="h-3.5 w-3.5" />
              7 strong matches found
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-mint/30 bg-mint/10 px-4 py-2 text-[12px] font-semibold text-mint">
              <ShieldCheck className="h-3.5 w-3.5" />
              Escrow ready
            </span>
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => nav("find-talent")}
              className="flex-1 rounded-xl bg-gradient-to-r from-brand to-brand-soft py-3 text-[13.5px] font-semibold glow-brand transition-shadow hover:shadow-[0_0_40px_rgba(0,211,149,0.6)]"
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
          <div className="space-y-6">
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
                Describe the work
              </span>
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                rows={5}
                placeholder="Scope, goals, deliverables, and anything a specialist should know…"
                className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[14px] leading-relaxed outline-none transition-colors placeholder:text-white/25 focus:border-brand/50"
              />
            </label>

            <div>
              <span className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
                Skills required
              </span>
              <div className="mt-3 flex flex-wrap gap-2.5">
                {FL_SKILLS.slice(0, 8).map((s) => (
                  <Chip key={s} active={skills.includes(s)} onClick={() => toggleSkill(s)}>
                    {s}
                  </Chip>
                ))}
              </div>
            </div>

            <div>
              <span className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
                Budget type
              </span>
              <div className="mt-3 inline-flex rounded-xl border border-white/10 bg-white/[0.03] p-1">
                {["Fixed", "Hourly"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={
                      type === t
                        ? "rounded-lg bg-brand px-5 py-2 text-[12.5px] font-semibold glow-brand"
                        : "rounded-lg px-5 py-2 text-[12.5px] font-medium text-white/50 hover:text-white"
                    }
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
                  {type === "Fixed" ? "Budget" : "Hourly rate"}
                </span>
                <input
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder={type === "Fixed" ? "$5,000" : "$90/hr"}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[14px] outline-none transition-colors placeholder:text-white/25 focus:border-brand/50"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
                  Timeline
                </span>
                <select
                  value={timeline}
                  onChange={(e) => setTimeline(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[14px] text-white/80 outline-none transition-colors focus:border-brand/50 [&>option]:bg-[#14141a]"
                >
                  {["Less than 1 week", "1–2 weeks", "2–4 weeks", "1–3 months", "3 months+"].map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
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
              <div className="mt-5 flex flex-wrap gap-6 border-t border-white/8 pt-4 text-[12.5px]">
                <span className="text-white/45">
                  {type} budget · <b className="font-display text-mint">{budget || "—"}</b>
                </span>
                <span className="text-white/45">
                  Timeline · <b className="text-white/80">{timeline}</b>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-mint/20 bg-mint/[0.06] p-4">
              <ShieldCheck className="h-5 w-5 shrink-0 text-mint" />
              <p className="text-[12.5px] leading-relaxed text-white/60">
                You'll fund the first milestone into escrow after choosing a
                freelancer. Nothing is charged until you hire.
              </p>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-brand/20 bg-brand/[0.06] p-4">
              <Users className="h-5 w-5 shrink-0 text-brand-soft" />
              <p className="text-[12.5px] leading-relaxed text-white/60">
                Based on your brief, ~<b className="text-white">7 specialists</b>{" "}
                are an instant match. Expect proposals within hours.
              </p>
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
            onClick={() => (step === 0 ? nav("home") : setStep((s) => s - 1))}
            className="inline-flex items-center gap-2 text-[13px] font-medium text-white/50 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            {step === 0 ? "Cancel" : "Back"}
          </button>
          <button
            onClick={() => (step < 2 ? setStep((s) => s + 1) : publish())}
            disabled={!canNext || submitting}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand to-brand-soft px-6 py-3 text-[13.5px] font-semibold glow-brand transition-all hover:shadow-[0_0_44px_rgba(0,211,149,0.6)] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
          >
            {step < 2 ? "Continue" : submitting ? "Publishing…" : "Publish brief"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
