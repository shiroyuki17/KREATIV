// Хүсэлт бүр apiClient-ээр дамжина — access token хугацаа дуусахад 401 дээр
// автоматаар refresh хийгээд хүсэлтийг давтана. Дуудагч талын `accessToken`
// аргумент нь буцаж нийцтэй байхын тулд үлдсэн ба ашиглагдахаа больсон.
import { apiJson, publicJson } from "./apiClient.js";

// { jobs, total, page, pageSize, totalPages } — нийтийн жагсаалт, нэвтрэлтгүй
export function fetchJobs(params = {}) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
  ).toString();
  return publicJson(`/jobs${query ? `?${query}` : ""}`);
}

// Ганц зар — хуваалцсан линкээр орж ирэхэд (URL-д зөвхөн id байна) хэрэгтэй.
export function fetchJob(id) {
  return publicJson(`/jobs/${id}`);
}

export function createJob(data) {
  return apiJson("/jobs", { method: "POST", body: data });
}

// FR-1.2: чөлөөтэй бичсэн санааг бүтэцтэй ажлын зар болгож хувиргана.
// { title, description, category, skills, budgetType, budgetMin, budgetMax }
export function generateJobDraft(idea) {
  return apiJson("/ai/job-draft", { method: "POST", body: { idea } });
}

// { jobs } — every job the logged-in client has posted, any status
export function fetchMyJobs() {
  return apiJson("/jobs/mine");
}

/**
 * Чөлөөт бичвэрээр ажил хайх (Gemini).
 *
 * Буцаах нь ердийн хайлтын хариу дээр нэмээд:
 *   filters        — AI ямар шүүлтүүр сонгосон (UI-д тусгаж, засах боломжтой)
 *   interpretation — "чамайг ингэж ойлголоо" гэсэн нэг өгүүлбэр
 *   source         — 'ai' | 'keyword' (keyword = AI тохируулаагүй/унасан)
 *   quotaRemaining — өдрийн үлдсэн AI хайлт (AI идэвхгүй үед null)
 */
export function searchJobsByPrompt(prompt, page = 1) {
  return apiJson("/ai/job-search", { method: "POST", body: { prompt, page } });
}
