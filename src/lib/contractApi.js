// Хүсэлт бүр apiClient-ээр дамжина — access token хугацаа дуусахад 401 дээр
// автоматаар refresh хийгээд хүсэлтийг давтана. Дуудагч талын `accessToken`
// аргумент нь буцаж нийцтэй байхын тулд үлдсэн ба ашиглагдахаа больсон.
import { apiJson, publicJson } from "./apiClient.js";

const authedJson = (path, { method = "GET", body } = {}) => apiJson(path, { method, body });

// ── Proposals (PRD FR-3) ──
export const submitProposal = (jobId, data, accessToken) =>
  authedJson(`/jobs/${jobId}/proposals`, { method: "POST", body: data, accessToken });

export const fetchJobProposals = (jobId, accessToken) =>
  authedJson(`/jobs/${jobId}/proposals`, { accessToken });

export const fetchMyProposals = (accessToken) => authedJson("/proposals/mine", { accessToken });

export const acceptProposal = (proposalId, milestones, accessToken) =>
  authedJson(`/proposals/${proposalId}/accept`, {
    method: "POST",
    body: milestones ? { milestones } : {},
    accessToken,
  });

// ── Contracts + Milestones (PRD FR-4) ──
export const fetchMyContracts = (accessToken) => authedJson("/contracts/mine", { accessToken });

export const fetchContract = (id, accessToken) => authedJson(`/contracts/${id}`, { accessToken });

export const fundMilestone = (id, accessToken) => authedJson(`/milestones/${id}/fund`, { method: "POST", accessToken });

export const deliverMilestone = (id, data, accessToken) =>
  authedJson(`/milestones/${id}/deliver`, { method: "POST", body: data, accessToken });

export const approveMilestone = (id, accessToken) => authedJson(`/milestones/${id}/approve`, { method: "POST", accessToken });

export const requestRevision = (id, note, accessToken) =>
  authedJson(`/milestones/${id}/request-revision`, { method: "POST", body: { note }, accessToken });

// ── Disputes (PRD FR-7) ──
export const openDispute = (milestoneId, reason, accessToken) =>
  authedJson("/disputes", { method: "POST", body: { milestoneId, reason }, accessToken });

export const fetchMyDisputes = (accessToken) => authedJson("/disputes/mine", { accessToken });

// ── Reviews (PRD FR-8) ──
export const submitReview = (contractId, data, accessToken) =>
  authedJson(`/contracts/${contractId}/reviews`, { method: "POST", body: data, accessToken });

export const fetchReviewsFor = (userId) => authedJson(`/reviews/for/${userId}`);

// Нийтийн "Success stories" хуудас — { stats, reviews }. Нэвтрэлт шаардахгүй.
export const fetchPublicReviews = () => publicJson("/reviews/public");

// ── Цаг бүртгэл ──
// Хугацааг ЗӨВХӨН сервер хэмждэг: клиент нь эхлүүл/зогсоо гэж хэлэх төдий.
// { entries, totalSeconds, running, canTrack }
export const fetchTimeEntries = (contractId) => authedJson(`/contracts/${contractId}/time`);

export const startTimer = (contractId, note) =>
  authedJson(`/contracts/${contractId}/time/start`, { method: "POST", body: note ? { note } : {} });

export const stopTimer = (contractId) =>
  authedJson(`/contracts/${contractId}/time/stop`, { method: "POST" });

export const deleteTimeEntry = (entryId) => authedJson(`/time/${entryId}`, { method: "DELETE" });
