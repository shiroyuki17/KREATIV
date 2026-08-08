// Хүсэлт бүр apiClient-ээр дамжина — access token хугацаа дуусахад 401 дээр
// автоматаар refresh хийгээд хүсэлтийг давтана. Дуудагч талын `accessToken`
// аргумент нь буцаж нийцтэй байхын тулд үлдсэн ба ашиглагдахаа больсон.
// (apiJson нь 204-ийг null болгож буцаадаг — DELETE /tasks/:id үүнийг хэрэглэнэ.)
import { apiJson } from "./apiClient.js";

const authedJson = (path, { method = "GET", body } = {}) => apiJson(path, { method, body });

// ── Kanban tasks (PRD FR-3.1) ──
export const fetchTasks = (contractId, accessToken) =>
  authedJson(`/contracts/${contractId}/tasks`, { accessToken });

export const createTask = (contractId, data, accessToken) =>
  authedJson(`/contracts/${contractId}/tasks`, { method: "POST", body: data, accessToken });

export const updateTask = (taskId, data, accessToken) =>
  authedJson(`/tasks/${taskId}`, { method: "PATCH", body: data, accessToken });

export const deleteTask = (taskId, accessToken) =>
  authedJson(`/tasks/${taskId}`, { method: "DELETE", accessToken });
