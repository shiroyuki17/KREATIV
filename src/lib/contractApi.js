import { API_BASE } from "./authApi.js";

function errorMessage(data) {
  if (Array.isArray(data?.error)) return data.error.join(", ");
  return data?.error || "Алдаа гарлаа. Дахин оролдоно уу.";
}

async function authedJson(path, { method = "GET", body, accessToken } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(errorMessage(data));
  return data;
}

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
