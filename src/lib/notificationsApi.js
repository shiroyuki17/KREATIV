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

// { notifications, unreadCount }
export const fetchNotifications = (accessToken) => authedJson("/notifications", { accessToken });

export const fetchNotificationUnreadCount = (accessToken) =>
  authedJson("/notifications/unread-count", { accessToken });

export const markNotificationRead = (id, accessToken) =>
  authedJson(`/notifications/${id}/read`, { method: "POST", accessToken });

export const markAllNotificationsRead = (accessToken) =>
  authedJson("/notifications/read-all", { method: "POST", accessToken });
