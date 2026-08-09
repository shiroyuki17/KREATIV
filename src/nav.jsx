import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  hasSession, fetchMe, clearTokens, ApiError, AUTH_EXPIRED_EVENT,
} from "./lib/authApi.js";

const NavCtx = createContext(null);

// Хэрэглэгч freelancer/client хоёр горимын аль нэгэнд байна. Энэ нь
// user.role (USER/ADMIN)-оос ТУСДАА ойлголт: нэг хүн хоёулаа байж болно —
// өдрөөр ажил захиалж, оройдоо ажил хайдаг. Сонголтыг localStorage-д
// хадгална: хуудас дахин ачаалахад горим сэргэх ёстой, гэхдээ энэ нь
// аюулгүй байдлын хил биш (сервер талд юу ч шийддэггүй) тул localStorage
// хангалттай.
const MODE_KEY = "kreativ:mode";

function storedMode() {
  try {
    const m = localStorage.getItem(MODE_KEY);
    return m === "freelancer" || m === "client" ? m : null;
  } catch {
    return null;
  }
}

// Хадгалсан сонголт нь тухайн хэрэглэгчид бодитоор боломжтой эсэхийг
// шалгана — жишээ нь "client" гэж хадгалаад, дараа нь өөр акаунтаар
// нэвтэрвэл (эсвэл client профайлаа устгуулбал) байхгүй горимд гацна.
function resolveMode(user, preferred) {
  if (!user) return null;
  const canFreelance = !!user.hasFreelancerProfile;
  const canHire = !!user.hasClientProfile;
  if (preferred === "freelancer" && canFreelance) return "freelancer";
  if (preferred === "client" && canHire) return "client";
  if (canFreelance) return "freelancer";
  if (canHire) return "client";
  // Аль нь ч байхгүй (onboarding дуусгаагүй) — сонгосон/өгөгдмөл утгыг
  // үлдээнэ, UI нь onboarding руу чиглүүлнэ.
  return preferred || "freelancer";
}

export const DASHBOARD_FOR = {
  freelancer: "freelancer-dashboard",
  client: "client-dashboard",
};

// Routes live under a "#/" prefix so plain in-page anchors (#categories,
// #jobs, …) keep working for smooth-scroll without being treated as pages.
// A "?query" suffix (e.g. the OAuth callback's #/auth-callback?accessToken=…)
// is stripped here — components that need it read window.location.hash directly.
function pageFromHash() {
  const h = window.location.hash || "";
  if (h.startsWith("#/")) {
    const path = h.slice(2).split("?")[0];
    return path || "home";
  }
  return "home";
}

export function NavProvider({ children }) {
  const [route, setRoute] = useState(() => ({ page: pageFromHash(), params: null }));

  // Real logged-in user (hydrated from the JWT access token, not a fake
  // localStorage flag) — null until the initial /auth/me call resolves, so
  // route-gating can tell "not logged in" apart from "haven't checked yet".
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [modePref, setModePref] = useState(storedMode);

  // `role` нь ЗӨВХӨН админ эрхийг илэрхийлнэ (sidebar-ийн Admin Panel мөр).
  // Өмнө нь энэ нь админ биш бүх хүнийг "client" гэж хатуу тэмдэглэдэг
  // байсан тул freelancer хэрэглэгч ч client мэт харагддаг байв — одоо
  // ажлын горимыг доорх `mode` тусад нь хариуцна.
  const role = user ? (user.role === "ADMIN" ? "admin" : "user") : null;
  const mode = resolveMode(user, modePref);

  // Хуудас ачаалах бүрд "би хэн бэ?"-г сервэрээс баталгаажуулна.
  //
  // Өмнө нь энд ЯМАР Ч алдаа гарвал `clearTokens()` дуудагддаг байсан нь
  // "reload хийхэд гараад байна" гэдгийн шалтгаан байв: access token нь
  // ердөө 15 минутын настай тул түүнээс хойш /auth/me тогтмол 401 буцаана —
  // хуучин код түүнийг "session дууссан" гэж үзээд хүчинтэй хэвээр байсан
  // refresh token-ыг ХАМТ нь устгаж, хэрэглэгчийг гаргаж хаядаг байлаа.
  // Одоо fetchMe нь apiClient-ээр дамждаг тул 401 дээр өөрөө refresh хийж
  // дахин оролдоно; энд зөвхөн refresh ч бүтэлгүйтсэн жинхэнэ 401 үед л
  // токеныг цэвэрлэнэ (сүлжээ тасарсан/сервер унасан тохиолдолд БИШ).
  useEffect(() => {
    if (!hasSession()) { setAuthReady(true); return; }
    fetchMe()
      .then(setUser)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) clearTokens();
      })
      .finally(() => setAuthReady(true));
  }, []);

  // Refresh token нь өөрөө хүчингүй болсон (хугацаа дууссан, өөр төхөөрөмжөөс
  // гарсан, rotation зөрчил илэрсэн) үед apiClient энэ эвентийг илгээнэ —
  // ямар ч гүнд байгаа хүсэлтээс ирсэн байсан UI-г нэг мөр цэгцэлнэ.
  useEffect(() => {
    const onExpired = () => {
      setUser(null);
      setRoute((prev) => (prev.page === "auth" ? prev : { page: "auth", params: null }));
      if (window.location.hash !== "#/auth") window.location.hash = "#/auth";
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, []);

  const nav = (page, params = null) => {
    setRoute({ page, params });
    const target = page === "home" ? "#/" : `#/${page}`;
    if (window.location.hash !== target) {
      // pushing the hash adds a history entry → browser back/forward works
      window.location.hash = target;
    }
    window.scrollTo({ top: 0 });
  };

  /**
   * Ажлын горимыг солино (freelancer ⇄ client).
   *
   * Хэрэв тухайн горимын профайл хараахан үүсээгүй бол шууд сольж чадахгүй —
   * жишээ нь client профайлгүй хүнийг client-dashboard руу оруулбал бүх
   * хүсэлт 403 буцаана. Иймд эхлээд onboarding руу оруулж профайлыг нь
   * үүсгүүлнэ; буцаж ирэхэд горим аль хэдийн сонгогдсон байна.
   */
  /**
   * Горимын сонголтыг ЗӨВХӨН хадгална — хаашаа ч шилжүүлэхгүй.
   *
   * Бүртгүүлэхэд сонгосон "I'm hiring" / "I'm freelancing" нь ҮНДСЭН горим
   * байх ёстой. Өмнө нь тэр сонголт зөвхөн харгалзах профайлыг үүсгэхэд
   * хэрэглэгдээд хаягддаг байсан: `resolveMode` нь юу ч хадгалагдаагүй үед
   * freelancer руу унадаг тул хэрэглэгч хоёр дахь профайлаа үүсгэмэгц
   * сонголт нь чимээгүй freelancer болж хувирдаг байв. Нэг профайлтай
   * байхад л санамсаргүй зөв ажиллаж байсан.
   */
  const setPreferredMode = useCallback((next) => {
    if (next !== "freelancer" && next !== "client") return;
    setModePref(next);
    try { localStorage.setItem(MODE_KEY, next); } catch { /* private mode */ }
  }, []);

  const switchMode = useCallback(
    (next) => {
      if (next !== "freelancer" && next !== "client") return;
      setModePref(next);
      try { localStorage.setItem(MODE_KEY, next); } catch { /* private mode */ }

      const ready = next === "freelancer" ? user?.hasFreelancerProfile : user?.hasClientProfile;
      nav(ready ? DASHBOARD_FOR[next] : "onboarding", ready ? null : { role: next });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user]
  );

  useEffect(() => {
    const onHash = () => {
      const p = pageFromHash();
      // Keep current params when the page didn't actually change (this fires
      // right after nav() sets the hash); clear them on real back/forward.
      setRoute((prev) => (prev.page === p ? prev : { page: p, params: null }));
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  return (
    <NavCtx.Provider
      value={{ ...route, nav, user, setUser, role, authReady, mode, switchMode, setPreferredMode }}
    >
      {children}
    </NavCtx.Provider>
  );
}

export const useNav = () => useContext(NavCtx);
