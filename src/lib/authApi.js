// Auth (register/login/Google OAuth/профайл) — бүх хүсэлт apiClient.js-ээр
// дамжина, тиймээс access token хугацаа дуусахад автоматаар refresh хийгдэнэ.
//
// Token хадгалалт болон API_BASE нь apiClient.js руу нүүсэн (refresh логик
// тэдгээрт хандах шаардлагатай бөгөөд circular import үүсгэхгүйн тулд). Аль
// хэдийн 30 гаруй файл эдгээрийг ЭНДЭЭС import хийдэг тул нэрийг нь хэвээр
// нь дамжуулан гаргаж, дуудагч талыг өөрчлөх шаардлагагүй болгов.
import {
  API_BASE,
  apiJson,
  apiRequest,
  errorMessage,
  ApiError,
  saveTokens,
  clearTokens,
  getAccessToken,
  getRefreshToken,
  hasSession,
  refreshAccessToken,
  AUTH_EXPIRED_EVENT,
  TOKEN_REFRESHED_EVENT,
} from "./apiClient.js";

export {
  API_BASE,
  saveTokens,
  clearTokens,
  getAccessToken,
  getRefreshToken,
  hasSession,
  refreshAccessToken,
  ApiError,
  AUTH_EXPIRED_EVENT,
  TOKEN_REFRESHED_EVENT,
};

// Нэвтрэх/бүртгүүлэх нь токенгүй дуудагдана — 401 дээр refresh оролдох нь
// утгагүй (мөн буруу нууц үг оруулсныг session дууссан мэт харагдуулна).
const postPublic = (path, body) => apiJson(path, { method: "POST", body, authed: false });

// { user, accessToken, refreshToken }
export function registerUser({ email, password, name, phone }) {
  return postPublic("/auth/register", { email, password, name, phone: phone || undefined });
}

// { user, accessToken, refreshToken }
export function loginUser({ email, password }) {
  return postPublic("/auth/login", { email, password });
}

// Server-side session revocation + local cleanup. Best-effort: логаут UI-д
// үргэлж шууд ажиллах ёстой тул сервер рүү өгсөн хүсэлт амжилтгүй болсон ч
// (сүлжээ тасарсан г.м) local token-уудыг цэвэрлэсээр байна.
export async function logoutUser() {
  const refreshToken = getRefreshToken();
  if (refreshToken) {
    try {
      await apiJson("/auth/logout", { method: "POST", body: { refreshToken }, authed: false });
    } catch { /* ignore — local cleanup still proceeds */ }
  }
  clearTokens();
}

// accessToken аргумент нь зөвхөн буцаж нийцтэй байхын тулд үлдсэн — бодит
// токеныг apiClient localStorage-оос уншина. Refresh нь токеныг сольдог тул
// React closure-т баригдсан хуучин утгыг ашиглах нь алдаатай болсон.
export function fetchMe() {
  return apiJson("/auth/me");
}

export function googleLoginUrl() {
  return `${API_BASE}/auth/google`;
}

// Backend returns a relative path (e.g. "/uploads/avatars/x.png") for our own
// uploads, but a full https:// URL for Google-sourced avatars — handle both.
export function avatarSrc(avatarUrl) {
  if (!avatarUrl) return null;
  return avatarUrl.startsWith("http") ? avatarUrl : `${API_BASE}${avatarUrl}`;
}

// Onboarding (Day 8): creates the real FreelancerProfile/ClientProfile row —
// without this, requireClientProfile (Jobs API) 403s for every new signup.
export function saveFreelancerProfile(data) {
  return apiJson("/profile/freelancer", { method: "POST", body: data });
}
export function saveClientProfile(data) {
  return apiJson("/profile/client", { method: "POST", body: data });
}

// FR-5.1: Verified badge — evidence нь portfolio холбоос + богино тайлбар
export function requestFreelancerVerification(evidence) {
  return apiJson("/profile/freelancer/verification", { method: "POST", body: { evidence } });
}

// Settings (Day 8/9): load the caller's own profile to edit — returns null
// (not an error) when the user simply hasn't created that profile type yet.
async function fetchOwnProfile(kind) {
  try {
    return await apiJson(`/profile/${kind}/me`);
  } catch (err) {
    // 404 = ийм профайл байхгүй (хэвийн). Бусад алдааг нуувал "профайл
    // байхгүй" мэт харагдаад Onboarding руу буруу шиднэ — тиймээс дамжуулна.
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}
export const fetchFreelancerProfile = () => fetchOwnProfile("freelancer");
export const fetchClientProfile = () => fetchOwnProfile("client");

// Нэвтэрсний дараа хаашаа явахыг тодорхойлно — `user.role` нь зөвхөн
// USER/ADMIN ялгаж өгдөг тул (freelancer/client профайлтай холбоогүй)
// хуучин код бүх хэрэглэгчийг client-dashboard руу чиглүүлдэг байсан bug-ыг
// засав. Хоёул профайлтай бол freelancer-ийг өгөгдмөлөөр, аль нь ч байхгүй
// бол (onboarding дуусгаагүй хуучин акаунт) onboarding руу шилжүүлнэ.
export async function resolveHomeRoute(user) {
  if (user.role === "ADMIN") return { page: "admin" };

  // "Профайл БАЙХГҮЙ" (404) болон "мэдэх боломжгүй байлаа" (сүлжээ/сервер
  // алдаа) хоёрыг заавал ялгана. Өмнө нь хоёуланг нь `.catch(() => null)`
  // залгидаг байсан тул түр зуурын алдаа гарахад аль хэдийн профайлтай
  // хэрэглэгчийг ОНБОАРДИНГ руу буцаадаг байв — fetchOwnProfile нь яг
  // үүнээс сэргийлэхийн тулд 404-өөс бусдыг зориуд шиддэг байсныг
  // утгагүй болгож байлаа.
  const settled = await Promise.allSettled([fetchFreelancerProfile(), fetchClientProfile()]);
  const [fl, cl] = settled;

  if (fl.status === "fulfilled" && fl.value) return { page: "freelancer-dashboard" };
  if (cl.status === "fulfilled" && cl.value) return { page: "client-dashboard" };

  // Аль нэг нь эвдэрсэн бол профайл байхгүй гэж дүгнэж болохгүй — дахин
  // онбоардинг хийлгэхээс дашбоард дээр нь үлдээх нь хамаагүй бага хор
  // хөнөөлтэй (дараагийн ачаалалт зөв төлөвийг олно).
  if (settled.some((r) => r.status === "rejected")) {
    return { page: "freelancer-dashboard" };
  }

  return { page: "onboarding", params: { role: "freelancer" } };
}

const REDIRECT_KEY = "kreativ_redirect_after_login";

// An anonymous visitor hitting a gated page (e.g. searching from the Hero
// bar → Find Talent) gets bounced to /auth with zero context, and used to
// lose whatever they were doing. sessionStorage (not in-memory JS state)
// survives the real page navigation Google's OAuth redirect does.
// Хадгалж БОЛОХГҮЙ хуудсууд:
//   auth / auth-callback / onboarding — нэвтрэлтийн урсгалын өөрийнх нь
//     алхмууд; өөрлүүгээ буцаах нь давталт үүсгэнэ.
//   home — Auth.jsx нь stash-ыг хэрэглэгчийн ЖИНХЭНЭ дашбоардаас илүүд
//     үздэг тул "home"-ыг хадгалбал нэвтэрсэн хүн дашбоард дээрээ очихын
//     оронд landing page руу буцна. Home бол ямар ч тохиолдолд өгөгдмөл
//     чиглэл тул хадгалах нь ашиггүй, харин хор нь бодитой.
const NEVER_STASH = new Set(["auth", "auth-callback", "onboarding", "home"]);

export function stashRedirect(page, params) {
  if (NEVER_STASH.has(page)) return;
  sessionStorage.setItem(REDIRECT_KEY, JSON.stringify({ page, params }));
}

export function consumeStashedRedirect() {
  const raw = sessionStorage.getItem(REDIRECT_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(REDIRECT_KEY);
  try {
    const stashed = JSON.parse(raw);
    // Уншихдаа ч дахин шалгана: хуучин хувилбарын үлдэгдэл ("home" гэж
    // хадгалагдсан) sessionStorage-д үлдсэн байж болно. Түүнийг хүлээн
    // авбал энэ хэрэглэгч дахин нэг удаа landing page руу шидэгдэнэ.
    if (!stashed?.page || NEVER_STASH.has(stashed.page)) return null;
    return stashed;
  } catch {
    return null;
  }
}

// FR-1.1: утасны OTP (демо горим — backend хариултад demoCode-ыг шууд
// буцаадаг тул жинхэнэ SMS gateway ирэх хүртэл UI дээр шууд харуулж болно)
export function requestPhoneOtp(phone) {
  return apiJson("/auth/phone/request-otp", { method: "POST", body: { phone } });
}
export function verifyPhoneOtp(phone, code) {
  return apiJson("/auth/phone/verify-otp", { method: "POST", body: { phone, code } });
}

// { id, email, name, phone, avatarUrl, role }
export async function uploadAvatar(file) {
  const form = new FormData();
  form.append("avatar", file);
  const res = await apiRequest("/profile/avatar", { method: "POST", body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(errorMessage(data), res.status);
  return data;
}
