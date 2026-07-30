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
