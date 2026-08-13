// Хүсэлт бүр apiClient-ээр дамжина — access token дуусахад автоматаар
// шинэчлэгдэнэ. `accessToken` аргумент нь зөвхөн буцаж нийцтэй байхын тулд
// үлдсэн (бодит токеныг apiClient өөрөө уншина).
import { apiJson } from "./apiClient.js";

function query(params) {
  const q = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
  ).toString();
  return q ? `?${q}` : "";
}

export const fetchAdminStats = () => apiJson("/admin/stats");

export const fetchAdminUsers = (params) => apiJson(`/admin/users${query(params)}`);

export const setUserActive = (userId, isActive) =>
  apiJson(`/admin/users/${userId}/status`, { method: "PATCH", body: { isActive } });

export const fetchAdminTransactions = (params) => apiJson(`/admin/transactions${query(params)}`);

export const fetchAdminDisputes = () => apiJson("/admin/disputes");

// FR-5.2: AI Dispute Auditor — зөвлөмж авах (эцсийн шийдвэр биш, зөвхөн санал)
export const fetchDisputeAiAnalysis = (id) => apiJson(`/admin/disputes/${id}/ai-analysis`);

export const resolveDispute = (id, resolution) =>
  apiJson(`/admin/disputes/${id}/resolve`, { method: "POST", body: { resolution } });

// FR-5.1: freelancer verification queue
export const fetchVerificationQueue = (status) => apiJson(`/admin/verifications${query({ status })}`);

export const decideVerification = (freelancerProfileId, approve, note) =>
  apiJson(`/admin/verifications/${freelancerProfileId}/decide`, { method: "POST", body: { approve, note } });

// FR-2.3: job moderation queue
export const fetchModerationQueue = () => apiJson("/admin/jobs/moderation");

export const moderateJob = (id, action) =>
  apiJson(`/admin/jobs/${id}/moderate`, { method: "POST", body: { action } });

// FR-6.4: payout queue
export const fetchPayoutQueue = () => apiJson("/admin/payouts");

export const approvePayout = (id) => apiJson(`/admin/payouts/${id}/approve`, { method: "POST" });

export const rejectPayout = (id) => apiJson(`/admin/payouts/${id}/reject`, { method: "POST" });

// NFR-1: ledger reconciliation
export const fetchReconciliation = () => apiJson("/admin/reconciliation");

// Аль гуравдагч үйлчилгээ тохируулагдсаныг харах (түлхүүр буцаахгүй).
export const fetchIntegrations = () => apiJson("/admin/integrations");
