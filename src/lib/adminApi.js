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
      Authorization: `Bearer ${accessToken}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(errorMessage(data));
  return data;
}

export const fetchAdminStats = (accessToken) => authedJson("/admin/stats", { accessToken });

export const fetchAdminUsers = (params, accessToken) => {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
  ).toString();
  return authedJson(`/admin/users${query ? `?${query}` : ""}`, { accessToken });
};

export const setUserActive = (userId, isActive, accessToken) =>
  authedJson(`/admin/users/${userId}/status`, { method: "PATCH", body: { isActive }, accessToken });

export const fetchAdminTransactions = (params, accessToken) => {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
  ).toString();
  return authedJson(`/admin/transactions${query ? `?${query}` : ""}`, { accessToken });
};

export const fetchAdminDisputes = (accessToken) => authedJson("/admin/disputes", { accessToken });

export const resolveDispute = (id, resolution, accessToken) =>
  authedJson(`/admin/disputes/${id}/resolve`, { method: "POST", body: { resolution }, accessToken });

// FR-2.3: job moderation queue
export const fetchModerationQueue = (accessToken) => authedJson("/admin/jobs/moderation", { accessToken });

export const moderateJob = (id, action, accessToken) =>
  authedJson(`/admin/jobs/${id}/moderate`, { method: "POST", body: { action }, accessToken });

// FR-6.4: payout queue
export const fetchPayoutQueue = (accessToken) => authedJson("/admin/payouts", { accessToken });

export const approvePayout = (id, accessToken) =>
  authedJson(`/admin/payouts/${id}/approve`, { method: "POST", accessToken });

export const rejectPayout = (id, accessToken) =>
  authedJson(`/admin/payouts/${id}/reject`, { method: "POST", accessToken });

// NFR-1: ledger reconciliation
export const fetchReconciliation = (accessToken) => authedJson("/admin/reconciliation", { accessToken });
