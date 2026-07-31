// Backend integration: Auth (register/login/Google OAuth callback) now goes
// through the real API. The rest of the app still runs on local/mock state
// (see src/data/*) until the wider Day 8 integration lands.
export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4100";

const ACCESS_KEY = "kreativ:accessToken";
const REFRESH_KEY = "kreativ:refreshToken";

function errorMessage(data) {
  if (Array.isArray(data?.error)) return data.error.join(", ");
  return data?.error || "Алдаа гарлаа. Дахин оролдоно уу.";
}

async function postJson(path, body, token) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(errorMessage(data));
  return data;
}

// { user, accessToken, refreshToken }
export function registerUser({ email, password, name, phone }) {
  return postJson("/auth/register", { email, password, name, phone: phone || undefined });
}

// { user, accessToken, refreshToken }
export function loginUser({ email, password }) {
  return postJson("/auth/login", { email, password });
}

export function saveTokens(accessToken, refreshToken) {
  try {
    localStorage.setItem(ACCESS_KEY, accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);
  } catch { /* ignore */ }
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

// Server-side session revocation + local cleanup. Best-effort: логаут UI-д
// үргэлж шууд ажиллах ёстой тул сервер рүү өгсөн хүсэлт амжилтгүй болсон ч
// (сүлжээ тасарсан г.м) local token-уудыг цэвэрлэсээр байна.
export async function logoutUser() {
  const refreshToken = getRefreshToken();
  if (refreshToken) {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
    } catch { /* ignore — local cleanup still proceeds */ }
  }
  clearTokens();
}

export async function fetchMe(accessToken) {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Failed to fetch current user");
  return res.json();
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
export function saveFreelancerProfile(data, accessToken) {
  return postJson("/profile/freelancer", data, accessToken);
}
export function saveClientProfile(data, accessToken) {
  return postJson("/profile/client", data, accessToken);
}

// Settings (Day 8/9): load the caller's own profile to edit — returns null
// (not an error) when the user simply hasn't created that profile type yet.
async function fetchOwnProfile(kind, accessToken) {
  const res = await fetch(`${API_BASE}/profile/${kind}/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  return res.json();
}
export const fetchFreelancerProfile = (accessToken) => fetchOwnProfile("freelancer", accessToken);
export const fetchClientProfile = (accessToken) => fetchOwnProfile("client", accessToken);

// FR-1.1: утасны OTP (демо горим — backend хариултад demoCode-ыг шууд
// буцаадаг тул жинхэнэ SMS gateway ирэх хүртэл UI дээр шууд харуулж болно)
export function requestPhoneOtp(phone, accessToken) {
  return postJson("/auth/phone/request-otp", { phone }, accessToken);
}
export function verifyPhoneOtp(phone, code, accessToken) {
  return postJson("/auth/phone/verify-otp", { phone, code }, accessToken);
}

// { id, email, name, phone, avatarUrl, role }
export async function uploadAvatar(file, accessToken) {
  const form = new FormData();
  form.append("avatar", file);
  const res = await fetch(`${API_BASE}/profile/avatar`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(errorMessage(data));
  return data;
}
