import { createContext, useContext, useEffect, useState } from "react";
import { getAccessToken, fetchMe, clearTokens } from "./lib/authApi.js";

const NavCtx = createContext(null);

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
  const role = user ? (user.role === "ADMIN" ? "admin" : "client") : null;

  useEffect(() => {
    const token = getAccessToken();
    if (!token) { setAuthReady(true); return; }
    fetchMe(token)
      .then(setUser)
      .catch(() => clearTokens())
      .finally(() => setAuthReady(true));
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

  return <NavCtx.Provider value={{ ...route, nav, user, setUser, role, authReady }}>{children}</NavCtx.Provider>;
}

export const useNav = () => useContext(NavCtx);
