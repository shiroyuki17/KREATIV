// Хүсэлт бүр apiClient-ээр дамжина — access token хугацаа дуусахад 401 дээр
// автоматаар refresh хийгээд хүсэлтийг давтана. Дуудагч талын `accessToken`
// аргумент нь буцаж нийцтэй байхын тулд үлдсэн ба ашиглагдахаа больсон:
// refresh нь токеныг сольдог тул React closure-т баригдсан хуучин утга
// найдваргүй — apiClient localStorage-оос шинэхнийг нь уншина.
import { apiJson } from "./apiClient.js";

const authedJson = (path, { method = "GET", body } = {}) => apiJson(path, { method, body });

// { notifications, unreadCount }
export const fetchNotifications = (accessToken) => authedJson("/notifications", { accessToken });

export const fetchNotificationUnreadCount = (accessToken) =>
  authedJson("/notifications/unread-count", { accessToken });

export const markNotificationRead = (id, accessToken) =>
  authedJson(`/notifications/${id}/read`, { method: "POST", accessToken });

export const markAllNotificationsRead = (accessToken) =>
  authedJson("/notifications/read-all", { method: "POST", accessToken });
