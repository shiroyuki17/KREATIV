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
import { useT } from "../../i18n.jsx";
import { TIMELINES, TIMELINE_LABEL } from "../../lib/timelines.js";
import { getAccessToken } from "../../lib/authApi.js";
import { createJob, generateJobDraft } from "../../lib/jobsApi.js";
import { fetchFreelancers } from "../../lib/talentApi.js";

const STEP_KEYS = ["pj.stepBasics", "pj.stepDetails", "pj.stepReview"];

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
  const t = useT();
  return (
    <div className="flex items-center gap-2">
      {STEP_KEYS.map((key, i) => (
        <div key={key} className="flex flex-1 items-center gap-2 last:flex-none">
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
          {i < STEP_KEYS.length - 1 && (
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
  { id: "Fixed", Icon: Wallet, labelKey: "pj.typeFixed", descKey: "pj.typeFixedDesc" },
  { id: "Hourly", Icon: Clock3, labelKey: "pj.typeHourly", descKey: "pj.typeHourlyDesc" },
];



export default function PostJob() {
  const { nav } = useNav();
  const t = useT();
  const [step, setStep] = useState(0);
  const [published, setPublished] = useState(false);

  const [title, setTitle] = useState("");
  const [cat, setCat] = useState("");
  const [desc, setDesc] = useState("");
  const [skills, setSkills] = useState([]);
  const [type, setType] = useState("Fixed");
  const [budget, setBudget] = useState("");
  const [timeline, setTimeline] = useState("2-4w");
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
    if (idea.length < 8) { setAiError(t("pj.ideaTooShort")); return; }
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

  // Continue товч дэмий л бүдгэрч, юу дутуугий нь хэлдэггүй байв —
  // хэрэглэгч категори сонгоогүйгээ анзаарахгүй тээнэгэлзэнэ.
  const missing =
    step === 0
      ? [!title.trim() && t("pj.mTitle"), !cat && t("pj.mCategory")].filter(Boolean)
      : step === 1
      ? [!desc.trim() && t("pj.mDesc"), !budget.trim() && t("pj.mBudget")].filter(Boolean)
      : [];

  const goNext = () => {
    if (!canNext || submitting) return;
    if (step < 2) setStep((s) => s + 1);
    else publish();
  };

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
          timeline,
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
            {pendingReview ? t("pj.submittedForReview") : t("pj.isLive")}
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-[13.5px] leading-relaxed text-white/50">
            {pendingReview
              ? t("pj.pendingDesc", { title })
              : t("pj.liveDesc", { title })}
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            {pendingReview ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-[12px] font-semibold text-amber-300">
                <ShieldCheck className="h-3.5 w-3.5" />
                {t("pj.awaitingApproval")}
              </span>
            ) : (
              <>
                {matchCount != null && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-4 py-2 text-[12px] font-semibold text-brand-soft">
                    <Sparkles className="h-3.5 w-3.5" />
                    {matchCount > 0 ? t("pj.matchesFound", { count: matchCount }) : t("pj.noMatchesYet")}
                  </span>
                )}
                <span className="inline-flex items-center gap-2 rounded-full border border-mint/30 bg-mint/10 px-4 py-2 text-[12px] font-semibold text-mint">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {t("pj.escrowReady")}
                </span>
              </>
            )}
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => nav("find-talent")}
              className="flex-1 rounded-xl bg-brand py-3 text-[13.5px] font-semibold glow-brand transition-shadow"
            >
              {t("pj.reviewMatches")}
            </button>
            <button
              onClick={() => nav("client-dashboard")}
              className="flex-1 rounded-xl border border-white/15 bg-white/[0.04] py-3 text-[13.5px] font-semibold text-white/85 transition-colors hover:border-white/25"
            >
              {t("pj.goToDashboard")}
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
        {step === 0 ? t("common.cancel") : t("common.back")}
      </button>

      <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-soft">
        {t("pj.eyebrow", { n: step + 1 })}
      </p>
      <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">
        {step === 0 ? t("pj.title0") : step === 1 ? t("pj.title1") : t("pj.title2")}
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
                {t("pj.draftWithAi")}
              </p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-white/50">
                {t("pj.draftWithAiDesc")}
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  value={aiIdea}
                  onChange={(e) => setAiIdea(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && draftWithAi()}
                  placeholder={t("pj.aiIdeaPlaceholder")}
                  className="flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[13px] outline-none transition-colors placeholder:text-white/30 focus:border-brand/50"
                />
                <button
                  onClick={draftWithAi}
                  disabled={aiDrafting}
                  className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-[12.5px] font-bold text-fg-1 transition-shadow disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {aiDrafting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  {aiDrafting ? t("pj.drafting") : t("pj.draft")}
                </button>
              </div>
              {aiError && <p className="mt-2 text-[11.5px] text-red-400">{aiError}</p>}
            </div>

            {/* AI бол товчлол, заавал биш — доорх талбаруудтай ямар
                хамааралтайг тодруулна. Өмнө нь дараалан жагссан тул эхлээд
                AI-г заавал ажиллуулах ёстой мэт харагддаг байв. */}
            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-white/8" />
              <span className="text-[10.5px] font-semibold uppercase tracking-widest text-white/25">
                {t("pj.orManual")}
              </span>
              <span className="h-px flex-1 bg-white/8" />
            </div>

            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
                {t("pj.projectTitle")}
              </span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                // Enter нь AI талбарт ажилладаг байсан ч энд ажилладаггүй
                // байсан тул хэрэглэгч заавал хулганаараа Continue дарах
                // шаардлагатай байв.
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); goNext(); } }}
                placeholder={t("pj.titlePlaceholder")}
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[14px] outline-none transition-colors placeholder:text-white/25 focus:border-brand/50"
              />
            </label>
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
                {t("pj.category")}
              </span>
              <div className="mt-3 flex flex-wrap gap-2.5">
                {CL_CATEGORIES.map((c) => (
                  // `c` нь CATEGORY_TO_API-ийн түлхүүр тул канон хэвээр
                  // үлдэнэ — зөвхөн шошгыг орчуулна.
                  <Chip key={c} active={cat === c} onClick={() => setCat(c)}>
                    {t(`clcat.${c}`)}
                  </Chip>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-7">
            <label className="block">
              <FieldLabel Icon={FileText} hint={t("pj.charCount", { n: desc.length })}>
                {t("pj.describeWork")}
              </FieldLabel>
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                rows={5}
                placeholder={t("pj.descPlaceholder")}
                className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[14px] leading-relaxed outline-none transition-colors placeholder:text-white/25 focus:border-brand/50"
              />
            </label>

            <div>
              <FieldLabel Icon={Tag} hint={t("pj.selectedCount", { n: skills.length })}>
                {t("pj.skillsRequired")}
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
              <FieldLabel Icon={Wallet}>{t("pj.budgetType")}</FieldLabel>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {BUDGET_TYPES.map(({ id, Icon, labelKey, descKey }) => (
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
                        {t(labelKey)}
                      </span>
                      <span className="mt-0.5 block text-[11.5px] leading-snug text-white/45">{t(descKey)}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block">
                <FieldLabel Icon={Wallet}>{type === "Fixed" ? t("pj.budget") : t("pj.hourlyRate")}</FieldLabel>
                <input
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); goNext(); } }}
                  placeholder={type === "Fixed" ? "$5,000" : "$90/hr"}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[14px] outline-none transition-colors placeholder:text-white/25 focus:border-brand/50"
                />
              </label>
              <div className="block">
                <FieldLabel Icon={CalendarClock}>{t("pj.timeline")}</FieldLabel>
                <div className="mt-3 flex flex-wrap gap-2">
                  {TIMELINES.map(({ value, labelKey }) => (
                    <Chip key={value} active={timeline === value} onClick={() => setTimeline(value)}>
                      {t(labelKey)}
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
              {t("pj.preview")}
            </p>

            <div className="rounded-xl border border-white/8 bg-white/[0.03] p-5">
              <p className="text-[10.5px] font-bold uppercase tracking-widest text-brand-soft">
                {cat ? t(`clcat.${cat}`) : t("pj.categoryPlaceholder")}
              </p>
              <h3 className="mt-2 font-display text-xl font-bold leading-snug">
                {title || t("pj.untitled")}
              </h3>
              <p className="mt-3 text-[13.5px] leading-relaxed text-white/60">
                {desc || t("pj.noDescription")}
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
                  <span className="text-[12.5px] text-white/70">{t(TIMELINE_LABEL[timeline])}</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-white/8 bg-white/[0.03] p-5">
              <p className="mb-3.5 text-[11px] font-semibold uppercase tracking-widest text-white/40">
                {t("pj.whatNext")}
              </p>
              <div className="space-y-3.5">
                <div className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-mint/30 bg-mint/10 text-mint">
                    <ShieldCheck className="h-3.5 w-3.5" />
                  </span>
                  <p className="pt-0.5 text-[12.5px] leading-relaxed text-white/60">
                    {t("pj.nextEscrow")}
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-brand/30 bg-brand/10 text-brand-soft">
                    <Users className="h-3.5 w-3.5" />
                  </span>
                  <p className="pt-0.5 text-[12.5px] leading-relaxed text-white/60">
                    {matchCount != null ? (
                      <>
                        <b className="text-white">{matchCount} {t("pj.nextMatchCount")}</b>{" "}
                        {t("pj.nextMatchRest")}
                      </>
                    ) : (
                      t("pj.nextMatchNone")
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
            {step === 0 ? t("common.cancel") : t("common.back")}
          </button>
          <div className="flex items-center gap-3">
            {missing.length > 0 && (
              <span className="text-[12px] text-white/40">
                {t("pj.missing", { items: missing.join(", ") })}
              </span>
            )}
            <button
              type="button"
              onClick={goNext}
              disabled={!canNext || submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3 text-[13.5px] font-semibold glow-brand transition-all disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
            >
              {step < 2 ? t("common.continue") : submitting ? t("pj.publishing") : t("pj.publish")}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
