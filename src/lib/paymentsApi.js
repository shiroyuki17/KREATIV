// Хүсэлт бүр apiClient-ээр дамжина — access token хугацаа дуусахад 401 дээр
// автоматаар refresh хийгээд хүсэлтийг давтана. Дуудагч талын `accessToken`
// аргумент нь буцаж нийцтэй байхын тулд үлдсэн ба ашиглагдахаа больсон.
import { apiJson, apiRequest } from "./apiClient.js";

const authedJson = (path, { method = "GET", body } = {}) => apiJson(path, { method, body });

export const fetchBalance = (accessToken) => authedJson("/payments/balance", { accessToken });

export const fetchTransactions = (accessToken) => authedJson("/payments/transactions", { accessToken });

// Демо QPay invoice үүсгэнэ — жинхэнэ мерчант данс байхгүй тул хэрэглэгч
// "Би төлсөн" дарахад confirmDeposit нь бодит банкны webhook-ийн байрыг эзэлнэ.
export const createDeposit = (amount, accessToken) =>
  authedJson("/payments/deposit", { method: "POST", body: { amount }, accessToken });

export const confirmDeposit = (id, accessToken) =>
  authedJson(`/payments/deposit/${id}/confirm`, { method: "POST", accessToken });

export const withdraw = (amount, accessToken) =>
  authedJson("/payments/withdraw", { method: "POST", body: { amount }, accessToken });

// FR-6.5: татварын тайланд зориулсан CSV — auth header шаардлагатай тул
// шууд <a href> линк биш, blob татаж хадгална.
export async function downloadTransactionsCsv() {
  const res = await apiRequest("/payments/export");
  if (!res.ok) throw new Error("Экспорт хийхэд алдаа гарлаа");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "kreativ-transactions.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
