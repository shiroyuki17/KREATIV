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
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(errorMessage(data));
  return data;
}

// ── Kanban tasks (PRD FR-3.1) ──
export const fetchTasks = (contractId, accessToken) =>
  authedJson(`/contracts/${contractId}/tasks`, { accessToken });

export const createTask = (contractId, data, accessToken) =>
  authedJson(`/contracts/${contractId}/tasks`, { method: "POST", body: data, accessToken });

export const updateTask = (taskId, data, accessToken) =>
  authedJson(`/tasks/${taskId}`, { method: "PATCH", body: data, accessToken });

export const deleteTask = (taskId, accessToken) =>
  authedJson(`/tasks/${taskId}`, { method: "DELETE", accessToken });
