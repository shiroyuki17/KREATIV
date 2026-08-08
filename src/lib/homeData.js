// Нүүр хуудасны хэсгүүдийн хуваалцдаг бодит өгөгдөл.
//
// Нүүр хуудсан дээр ажлын зар ашигладаг 5 хэсэг (LiveBriefs, TrendingNow,
// JobBoard, BentoShowcase, StandoutWork) байдаг. Тус бүр өөрөө fetch хийвэл
// нэг хуудас ачаалахад 5 ижил хүсэлт явна. Тиймээс модулийн түвшинд нэг
// promise-ыг хуваалцана — эхний дуудагч хүсэлтийг эхлүүлж, бусад нь түүнийг
// хүлээнэ.
//
// Өмнө нь эдгээр бүх хэсэг src/data/mock.js-ийн зохиомол зар/талант
// харуулдаг байсан: дарахад өргөдөл өгөх боломжгүй, DB-д байхгүй хүмүүс.
import { useEffect, useState } from "react";
import { fetchJobs } from "./jobsApi.js";
import { fetchFreelancers } from "./talentApi.js";

let jobsPromise = null;
let talentPromise = null;

export function loadHomeJobs() {
  if (!jobsPromise) {
    // Алдаа гарвал кэшийг цэвэрлэнэ — эс тэгвээс нэг удаагийн сүлжээний
    // доголдол хуудсыг дахин ачаалах хүртэл үүрд хоосон болгоно.
    jobsPromise = fetchJobs({ pageSize: 12 })
      .then((r) => r.jobs)
      .catch((err) => { jobsPromise = null; throw err; });
  }
  return jobsPromise;
}

export function loadHomeTalent() {
  if (!talentPromise) {
    talentPromise = fetchFreelancers({ pageSize: 12 })
      .then((r) => r.freelancers)
      .catch((err) => { talentPromise = null; throw err; });
  }
  return talentPromise;
}

/** null = ачаалж байна, [] = байхгүй/алдаа. Хоёрыг ялгаж UI зөв харуулна. */
function useShared(loader) {
  const [data, setData] = useState(null);
  useEffect(() => {
    let cancelled = false;
    loader()
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setData([]); });
    return () => { cancelled = true; };
  }, [loader]);
  return data;
}

export const useHomeJobs = () => useShared(loadHomeJobs);
export const useHomeTalent = () => useShared(loadHomeTalent);

// ── Дэлгэцэнд харуулах хэлбэр рүү хөрвүүлэх ──

export function formatBudget(job) {
  const { budgetMin, budgetMax, budgetType } = job;
  if (budgetMin == null && budgetMax == null) return "Budget on request";
  const unit = budgetType === "HOURLY" ? "/hr" : "";
  const n = (v) => `$${v.toLocaleString("en-US")}`;
  if (budgetMin != null && budgetMax != null && budgetMax !== budgetMin) {
    return `${n(budgetMin)}–${n(budgetMax)}${unit}`;
  }
  return `${n(budgetMin ?? budgetMax)}${unit}`;
}

export function timeAgo(iso) {
  const hours = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/**
 * Бодит Job-ыг нүүр хуудасны картуудын хүлээж буй хэлбэрт оруулна.
 *
 * `raw`-г хамт авч явна: карт дээр дарахад ProjectDetail рүү ЖИНХЭНЭ бичлэгийг
 * дамжуулах ёстой (тэнд `"budgetType" in job` гэж бодит эсэхийг шалгадаг).
 */
export function toJobCard(job) {
  return {
    id: job.id,
    cat: job.category,
    title: job.title,
    budget: formatBudget(job),
    posted: timeAgo(job.createdAt),
    type: job.budgetType === "HOURLY" ? "Hourly" : "Fixed",
    client: job.client?.orgName || job.client?.name || "Client",
    verified: !!job.client?.verifiedPayer,
    rating: job.client?.ratingAvg > 0 ? job.client.ratingAvg : null,
    tags: job.skills || [],
    raw: job,
  };
}

export function toTalentCard(f) {
  return {
    userId: f.userId,
    name: f.name || "Freelancer",
    role: f.headline || "Freelancer",
    cat: f.category,
    rating: f.ratingAvg > 0 ? f.ratingAvg : null,
    hired: f.jobsCompleted || 0,
    skills: f.skills || [],
    avatarUrl: f.avatarUrl || null,
    initials: (f.name || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase(),
    raw: f,
  };
}
