import { API_BASE } from "./authApi.js";

function errorMessage(data) {
  if (Array.isArray(data?.error)) return data.error.join(", ");
  return data?.error || "Алдаа гарлаа. Дахин оролдоно уу.";
}

// { freelancers, total, page, pageSize, totalPages }
export async function fetchFreelancers(params = {}) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
  ).toString();
  const res = await fetch(`${API_BASE}/profile/freelancers${query ? `?${query}` : ""}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(errorMessage(data));
  return data;
}

// A single public profile, keyed by the freelancer's userId
export async function fetchFreelancerByUserId(userId) {
  const res = await fetch(`${API_BASE}/profile/freelancer/${userId}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(errorMessage(data));
  return data;
}
