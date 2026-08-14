// Хүсэлт бүр apiClient-ээр дамжина — access token хугацаа дуусахад 401 дээр
// автоматаар refresh хийгээд хүсэлтийг давтана. Дуудагч талын `accessToken`
// аргумент нь буцаж нийцтэй байхын тулд үлдсэн ба ашиглагдахаа больсон.
import { apiJson, apiRequest } from "./apiClient.js";
import { translate } from "../locales/translate.js";

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

// Сервер `Content-Disposition: attachment; filename="…"` буцаадаг — файлын
// нэрийг эндээс авбал огноо нь тайлан бүр дээр өөр байна.
function filenameFrom(res, fallback) {
  const cd = res.headers.get("Content-Disposition") || "";
  const m = /filename="?([^";]+)"?/.exec(cd);
  return m ? m[1] : fallback;
}

/**
 * FR-6.5: татварын тайланд зориулсан CSV.
 *
 * Auth header шаардлагатай тул шууд <a href> линк биш, blob татаж хадгална.
 * `locale` нь толгой мөр, төрлийн нэрийг хэрэглэгчийн хэлээр гаргуулна.
 */
export async function downloadTransactionsCsv(locale = "mn") {
  const res = await apiRequest(`/payments/export?lang=${locale === "en" ? "en" : "mn"}`);
  if (!res.ok) throw new Error(translate("err.exportFailed"));

  const csv = await res.text();
  // Зөвхөн толгой мөртэй файл татуулах нь "ажиллаа" гэж хуурна — гүйлгээ
  // байхгүй гэдгийг ил хэлэх нь дээр. (res.text() нь BOM-ыг өөрөө хасна.)
  const dataRows = csv.split(/\r?\n/).slice(1).filter((l) => l.trim() !== "");
  if (dataRows.length === 0) throw new Error(translate("err.exportEmpty"));

  // res.text() нь UTF-8 задлахдаа BOM-ыг хасдаг тул энд буцааж нэмнэ —
  // үгүй бол Excel кирилл толгойг legacy кодчлолоор уншиж эвдэнэ.
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filenameFrom(res, "kreativ-transactions.csv");
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
