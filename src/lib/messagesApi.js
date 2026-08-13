// Хүсэлт бүр apiClient-ээр дамжина — access token хугацаа дуусахад 401 дээр
// автоматаар refresh хийгээд хүсэлтийг давтана. Дуудагч талын `accessToken`
// аргумент нь буцаж нийцтэй байхын тулд үлдсэн ба ашиглагдахаа больсон.
import { apiJson, apiRequest, errorMessage, ApiError } from "./apiClient.js";

const authedJson = (path, { method = "GET", body } = {}) => apiJson(path, { method, body });

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

// FR-2.1: файл хавсаргах — multipart тул authedJson-ийг ашиглахгүй
// (Content-Type-ийг browser өөрөө boundary-тай тохируулах ёстой).
export async function sendFile(conversationId, file) {
  const form = new FormData();
  form.append("file", file);
  const res = await apiRequest(`/messages/conversations/${conversationId}/attachments`, {
    method: "POST",
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(errorMessage(data), res.status);
  return data;
}

export const fetchMessageUnreadCount = (accessToken) =>
  authedJson("/messages/unread-count", { accessToken });

export const searchPeople = (q) =>
  authedJson(`/messages/people?q=${encodeURIComponent(q)}`);

export const blockUser = (userId) =>
  authedJson("/messages/blocks", { method: "POST", body: { userId } });

export const unblockUser = (userId) =>
  authedJson(`/messages/blocks/${userId}`, { method: "DELETE" });
