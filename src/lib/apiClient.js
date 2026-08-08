// Бүх backend хүсэлтийн ганц гарц.
//
// Яагаад төвлөрүүлэх шаардлагатай болов:
//  1. Access token нь 15 минутын дараа хүчингүй болдог (ACCESS_TOKEN_TTL).
//     Өмнө нь 8 файл тус тусдаа `fetch(..., Authorization: Bearer ...)`
//     бичдэг байсан тул 401 ирэхэд ямар ч файл түүнийг сэргээх гэж
//     оролддоггүй — 15 минутын дараа бүх дуудлага чимээгүй уначихдаг байв.
//  2. Refresh нь rotation хийдэг (хуучин refresh token нэг удаа хэрэглэгдмэгц
//     хүчингүй болно). Хэрэв хоёр хүсэлт зэрэг 401 аваад тус тусдаа refresh
//     дуудвал хоёр дахь нь аль хэдийн rotate хийгдсэн token илгээх бөгөөд
//     backend үүнийг "token хулгайлагдсан" гэж үзээд тухайн хэрэглэгчийн БҮХ
//     session-ийг устгадаг (auth.routes.js). Тиймээс refresh нь заавал
//     single-flight байх ёстой — доорх `refreshPromise` яг үүнийг хангана.
// `?.` нь Vite-аас гадуур (жишээ нь Node дээр энэ модулийг шууд тестлэхэд)
// import.meta.env тодорхойгүй байхад унахаас сэргийлнэ — Vite build дээр
// import.meta.env-ийг статикаар орлуулдаг тул нөлөөгүй.
export const API_BASE = import.meta.env?.VITE_API_URL || "http://localhost:4100";

const ACCESS_KEY = "kreativ:accessToken";
const REFRESH_KEY = "kreativ:refreshToken";

// Token шинэчлэгдэхэд socket.js энэ эвентийг сонсож холболтоо шинэ токеноор
// дахин үүсгэнэ (socket handshake нь access token шалгадаг тул хуучирсан
// токентой socket дахин холбогдож чадахгүй).
export const TOKEN_REFRESHED_EVENT = "kreativ:token-refreshed";
// Refresh ч бүтэлгүйтсэн = үнэхээр гарах ёстой. nav.jsx үүнийг сонсоод
// хэрэглэгчийг цэвэрлэж, нэвтрэх хуудас руу шилжүүлнэ.
export const AUTH_EXPIRED_EVENT = "kreativ:auth-expired";

function emit(name, detail) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(name, { detail }));
}

// ── Token хадгалалт ──
export function saveTokens(accessToken, refreshToken) {
  try {
    localStorage.setItem(ACCESS_KEY, accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);
  } catch { /* private mode — санах ойд ажиллана */ }
}

export function clearTokens() {
  try {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  } catch { /* ignore */ }
}

export function getAccessToken() {
  try { return localStorage.getItem(ACCESS_KEY); } catch { return null; }
}

export function getRefreshToken() {
  try { return localStorage.getItem(REFRESH_KEY); } catch { return null; }
}

/** Refresh token байгаа эсэх — "нэвтэрсэн үү?" гэдгийн бодит хариулт.
 *  Access token хугацаа нь дуусаад байж болох тул түүний оршихуй нь
 *  нэвтэрсэн гэдгийн баталгаа биш. */
export function hasSession() {
  return !!(getAccessToken() || getRefreshToken());
}

// ── Алдаа ──
export function errorMessage(data) {
  if (Array.isArray(data?.error)) return data.error.join(", ");
  return data?.error || "Алдаа гарлаа. Дахин оролдоно уу.";
}

/** HTTP статустай алдаа — дуудагч тал 401-ийг сүлжээний алдаанаас ялгах
 *  боломжтой болно (nav.jsx зөвхөн жинхэнэ 401 дээр л token цэвэрлэнэ). */
export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// ── Refresh (single-flight) ──
let refreshPromise = null;

async function doRefresh() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  let res;
  try {
    res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    // Сүлжээ тасарсан — session хүчингүй болсон гэсэн үг БИШ. Token-уудыг
    // хэвээр үлдээж, дараагийн оролдлогод дахин үзнэ.
    return null;
  }

  if (!res.ok) {
    // 5xx бол серверийн түр зуурын асуудал — хэрэглэгчийг гаргах шалтгаан
    // болохгүй. Зөвхөн 4xx (token үнэхээр хүчингүй) үед л session-ийг дуусгана.
    if (res.status >= 500) return null;
    clearTokens();
    emit(AUTH_EXPIRED_EVENT);
    return null;
  }

  const data = await res.json().catch(() => ({}));
  if (!data.accessToken || !data.refreshToken) return null;

  saveTokens(data.accessToken, data.refreshToken);
  emit(TOKEN_REFRESHED_EVENT, { accessToken: data.accessToken });
  return data.accessToken;
}

/** Зэрэг дуудагдсан бүх хүсэлт нэг л refresh хүлээнэ. */
export function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

// ── Хүсэлт ──
function buildRequest(path, { method, body, headers, authed }) {
  const token = authed ? getAccessToken() : null;
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  return fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      // FormData үед Content-Type-ыг ГАРААР тавьж болохгүй — browser өөрөө
      // multipart boundary-тай нь хамт тохируулах ёстой.
      ...(body && !isForm ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: isForm ? body : body ? JSON.stringify(body) : undefined,
  });
}

/**
 * Түүхий Response буцаана (blob/CSV татах гэх мэт JSON биш хариултад).
 * 401 ирвэл нэг удаа refresh хийгээд хүсэлтийг давтана.
 */
export async function apiRequest(path, { method = "GET", body, headers, authed = true } = {}) {
  let res = await buildRequest(path, { method, body, headers, authed });

  if (res.status === 401 && authed && getRefreshToken()) {
    const fresh = await refreshAccessToken();
    if (fresh) res = await buildRequest(path, { method, body, headers, authed });
  }

  return res;
}

/** JSON хариулт — амжилтгүй бол ApiError шиднэ. 204 үед null. */
export async function apiJson(path, opts = {}) {
  const res = await apiRequest(path, opts);
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(errorMessage(data), res.status);
  return data;
}

/** Нэвтрэлт шаарддаггүй нийтийн endpoint (jobs жагсаалт, талентын профайл…). */
export const publicJson = (path, opts = {}) => apiJson(path, { ...opts, authed: false });
