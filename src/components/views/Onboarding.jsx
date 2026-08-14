import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Sparkles, AlertCircle } from "lucide-react";
import Magnet from "../fx/Magnet.jsx";
import { FL_SKILLS, FL_CATEGORIES, CL_CATEGORIES, CL_BUDGETS } from "../../data/appMock.js";
import { useNav } from "../../nav.jsx";
import { useT } from "../../i18n.jsx";
import { getAccessToken, saveFreelancerProfile, saveClientProfile, fetchMe, updateAccountName } from "../../lib/authApi.js";
import { fetchJobs } from "../../lib/jobsApi.js";
import { fetchFreelancers } from "../../lib/talentApi.js";

function Field({ label, ...props }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
        {label}
      </span>
      <input
        {...props}
        className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[14px] outline-none transition-colors placeholder:text-white/25 focus:border-brand/50"
      />
    </label>
  );
}

function Chip({ active, children, onClick }) {
  return (
    <button
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

function Steps({ step }) {
  return (
    <div className="flex items-center gap-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex flex-1 items-center gap-2 last:flex-none">
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
          {i < 2 && (
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

export default function Onboarding() {
  const { params, nav, setUser, setPreferredMode } = useNav();
  const t = useT();
  const role = params?.role || "freelancer";
  const isFl = role === "freelancer";

  const [step, setStep] = useState(0);
  const [category, setCategory] = useState(FL_CATEGORIES[0]);
  const [picked, setPicked] = useState([]);
  const [avail, setAvail] = useState(isFl ? "OPEN" : CL_BUDGETS[1]);
  const [fullName, setFullName] = useState("");
  const [title, setTitle] = useState("");
  const [rate, setRate] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [yourRole, setYourRole] = useState("");
  const [teamSize, setTeamSize] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [liveStat, setLiveStat] = useState(null);

  const toggle = (s) =>
    setPicked((arr) => (arr.includes(s) ? arr.filter((x) => x !== s) : [...arr, s]));

  // Зохиомол тоо ("3 briefs match", "12,400 freelancers") биш, бодит тоог
  // харуулна — эцсийн алхамд хүрэхэд л асуулт явуулна.
  useEffect(() => {
    if (step !== 2) return;
    if (isFl) {
      fetchJobs({ category, pageSize: 1 }).then((res) => setLiveStat(res.total)).catch(() => {});
    } else {
      fetchFreelancers({ pageSize: 1 }).then((res) => setLiveStat(res.total)).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const chips = isFl ? FL_SKILLS : CL_CATEGORIES;
  // Утга нь backend-ийн Availability enum — өмнө нь "Full-time/Part-time/
  // Weekends" гэсэн гурван чип байсан ч тэдгээрт тохирох талбар байхгүй тул
  // сонголт нь хадгалагдалгүй устдаг байв. Одоо профайл дээр гарах бодит
  // төлөв рүү шууд буудаг.
  const availOptions = isFl
    ? [
        { value: "OPEN", label: t("onb.availOpen") },
        { value: "BUSY", label: t("onb.availBusy") },
        { value: "CLOSED", label: t("onb.availClosed") },
      ]
    : CL_BUDGETS.map((b) => ({ value: b, label: b }));
  const doneTarget = isFl ? "freelancer-dashboard" : "client-dashboard";

  async function finish() {
    const token = getAccessToken();
    if (!token) { nav(doneTarget); return; }

    setSubmitting(true);
    setError("");
    try {
      // Бөглүүлсэн бүх талбарыг хадгална. Өмнө нь нэр, ажиллах боломж,
      // албан тушаал, багийн хэмжээ дөрвийг асуугаад хаядаг байсан —
      // хэрэглэгчийн бичсэн зүйл алга болох нь асуухгүй байхаас ч дор.
      if (fullName.trim().length >= 2) {
        await updateAccountName(fullName.trim()).catch(() => {});
      }
      if (isFl) {
        const priceMin = parseInt(rate.replace(/[^0-9]/g, ""), 10) || undefined;
        await saveFreelancerProfile(
          {
            headline: title || undefined,
            category,
            skills: picked,
            priceMin,
            priceMax: priceMin,
            availability: avail,
          },
          token
        );
      } else {
        await saveClientProfile(
          {
            orgName: companyName || undefined,
            contactRole: yourRole || undefined,
            teamSize: teamSize || undefined,
          },
          token
        );
      }
      // Бүртгүүлэхэд сонгосон тал (I'm hiring / I'm freelancing) нь ҮНДСЭН
      // горим болно. Үүнийг хадгалахгүй бол resolveMode нь өгөгдмөлөөр
      // freelancer руу унадаг тул хэрэглэгч хоёр дахь профайлаа үүсгэмэгц
      // анхны сонголт нь чимээгүй алдагддаг.
      setPreferredMode(isFl ? "freelancer" : "client");

      // Профайл шинээр үүссэн тул /auth/me-ийн hasFreelancerProfile /
      // hasClientProfile өөрчлөгдсөн. Дахин татаж авахгүй бол sidebar-ийн
      // горим солигч "профайл байхгүй" гэж үзсээр байгаад дахин onboarding
      // руу эргүүлэх мөчлөгт орно. Амжилтгүй болбол шилжилтийг зогсоохгүй —
      // дараагийн хуудас ачаалалт ямар ч байсан шинэчилнэ.
      await fetchMe().then(setUser).catch(() => {});
      nav(doneTarget);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-6 py-28">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/4 h-[420px] w-[640px] -translate-x-1/2 rounded-full bg-brand/15 blur-[140px]"
      />

      <div className="relative w-full max-w-xl">
        <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-soft">
          {isFl ? t("onb.freelancerSetup") : t("onb.clientSetup")} · {t("onb.stepOf", { n: step + 1 })}
        </p>
        <div className="mx-auto mb-8 max-w-xs">
          <Steps step={step} />
        </div>

        <div className="glass rounded-3xl p-8">
          {step === 0 && (
            <div className="space-y-5">
              <h1 className="font-display text-2xl font-bold tracking-tight">
                {isFl ? t("onb.aboutYou") : t("onb.aboutCompany")}
              </h1>
              {isFl ? (
                <>
                  <Field label={t("onb.fullName")} placeholder="Daniel Kim" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  <Field label={t("onb.professionalTitle")} placeholder="Full-Stack Developer" value={title} onChange={(e) => setTitle(e.target.value)} />
                  <Field label={t("onb.hourlyRate")} placeholder="$95/hr" value={rate} onChange={(e) => setRate(e.target.value)} />
                </>
              ) : (
                <>
                  <Field label={t("onb.companyName")} placeholder="Nova Studio" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                  <Field label={t("onb.yourRole")} placeholder="Head of Product" value={yourRole} onChange={(e) => setYourRole(e.target.value)} />
                  <Field label={t("onb.teamSize")} placeholder="11 – 50" value={teamSize} onChange={(e) => setTeamSize(e.target.value)} />
                </>
              )}
            </div>
          )}

          {step === 1 && (
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight">
                {isFl ? t("onb.superpowers") : t("onb.whatNeedBuilt")}
              </h1>
              <p className="mt-1.5 text-[13px] text-white/45">
                {isFl
                  ? t("onb.pickSkills")
                  : t("onb.pickCategories")}
              </p>
              {isFl && (
                <>
                  <p className="mt-6 text-[11px] font-semibold uppercase tracking-widest text-white/40">
                    {t("onb.primaryCategory")}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2.5">
                    {FL_CATEGORIES.map((c) => (
                      <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
                        {c}
                      </Chip>
                    ))}
                  </div>
                  <p className="mt-7 text-[11px] font-semibold uppercase tracking-widest text-white/40">
                    {t("onb.skills")}
                  </p>
                </>
              )}
              <div className="mt-6 flex flex-wrap gap-2.5">
                {chips.map((s) => (
                  <Chip key={s} active={picked.includes(s)} onClick={() => toggle(s)}>
                    {s}
                  </Chip>
                ))}
              </div>
              <p className="mt-7 text-[11px] font-semibold uppercase tracking-widest text-white/40">
                {isFl ? t("onb.availability") : t("onb.typicalBudget")}
              </p>
              <div className="mt-3 flex flex-wrap gap-2.5">
                {availOptions.map(({ value, label }) => (
                  <Chip key={value} active={avail === value} onClick={() => setAvail(value)}>
                    {label}
                  </Chip>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="text-center">
              <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2 border-mint bg-mint/10 text-mint">
                <Check className="h-9 w-9" />
              </span>
              <h1 className="mt-6 font-display text-2xl font-bold tracking-tight">
                {t("onb.done")}
              </h1>
              <p className="mx-auto mt-2 max-w-sm text-[13.5px] leading-relaxed text-white/50">
                {isFl
                  ? t("onb.doneFreelancer")
                  : t("onb.doneClient")}
              </p>
              {picked.length > 0 && (
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {picked.slice(0, 6).map((s) => (
                    <span
                      key={s}
                      className="rounded-full border border-brand/25 bg-brand/8 px-3 py-1.5 text-[11.5px] font-medium text-brand-soft"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}
              {liveStat != null && (
                <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-neon/25 bg-neon/8 px-4 py-2 text-[12px] font-medium text-neon">
                  <Sparkles className="h-3.5 w-3.5" />
                  {isFl
                    ? liveStat > 0
                      ? t("onb.openBriefs", { count: liveStat, category })
                      : t("onb.noOpenBriefs", { category })
                    : t("onb.freelancersReady", { count: liveStat.toLocaleString("en-US") })}
                </p>
              )}
            </div>
          )}

          {error && (
            <p className="mt-5 flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-[12.5px] font-medium text-red-400">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
            </p>
          )}

          <div className="mt-8 flex items-center justify-between border-t border-white/8 pt-6">
            {step > 0 ? (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="inline-flex items-center gap-2 text-[13px] font-medium text-white/50 transition-colors hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                {t("common.back")}
              </button>
            ) : (
              <button
                onClick={() => nav("auth")}
                className="inline-flex items-center gap-2 text-[13px] font-medium text-white/50 transition-colors hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                {t("common.cancel")}
              </button>
            )}
            <Magnet strength={0.15}>
              <button
                onClick={() => (step < 2 ? setStep((s) => s + 1) : finish())}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3 text-[13.5px] font-semibold glow-brand transition-shadow disabled:cursor-not-allowed disabled:opacity-50"
              >
                {step < 2 ? t("common.continue") : submitting ? t("onb.settingUp") : t("onb.goToDashboard")}
                <ArrowRight className="h-4 w-4" />
              </button>
            </Magnet>
          </div>
        </div>
      </div>
    </div>
  );
}
