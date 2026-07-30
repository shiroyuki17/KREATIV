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

// { conversations: [{ id, with:{id,name,avatarUrl}, lastMessage, unread, updatedAt }] }
export const fetchConversations = (accessToken) => authedJson("/messages/conversations", { accessToken });

// Get-or-create a conversation with another user — { id, with }
export const startConversation = (userId, accessToken) =>
  authedJson("/messages/conversations", { method: "POST", body: { userId }, accessToken });

// { messages: [...] } — also marks the other party's messages read
export const fetchThread = (conversationId, accessToken) =>
  authedJson(`/messages/conversations/${conversationId}/messages`, { accessToken });

export const sendMessage = (conversationId, text, accessToken) =>
  authedJson(`/messages/conversations/${conversationId}/messages`, {
    method: "POST",
    body: { text },
    accessToken,
  });

export const fetchMessageUnreadCount = (accessToken) =>
  authedJson("/messages/unread-count", { accessToken });
