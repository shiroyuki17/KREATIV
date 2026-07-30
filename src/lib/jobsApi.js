import { API_BASE } from "./authApi.js";

function errorMessage(data) {
  if (Array.isArray(data?.error)) return data.error.join(", ");
  return data?.error || "Алдаа гарлаа. Дахин оролдоно уу.";
}

// { jobs, total, page, pageSize, totalPages }
export async function fetchJobs(params = {}) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
  ).toString();
  const res = await fetch(`${API_BASE}/jobs${query ? `?${query}` : ""}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(errorMessage(data));
  return data;
}

export async function createJob(data, accessToken) {
  const res = await fetch(`${API_BASE}/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(data),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(errorMessage(json));
  return json;
}
