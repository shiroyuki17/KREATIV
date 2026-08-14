import { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";
import { useNav } from "../../nav.jsx";
import { useT } from "../../i18n.jsx";
import { saveTokens, fetchMe, resolveHomeRoute, consumeStashedRedirect } from "../../lib/authApi.js";

export default function AuthCallback() {
  const t = useT();
  const { nav, setUser } = useNav();
  const [error, setError] = useState(null);

  useEffect(() => {
    const query = window.location.hash.split("?")[1] || "";
    const params = new URLSearchParams(query);
    const oauthError = params.get("oauth_error");
    const accessToken = params.get("accessToken");
    const refreshToken = params.get("refreshToken");

    if (oauthError) {
      nav("auth", { oauthError });
      return;
    }
    if (!accessToken || !refreshToken) {
      setError(t("ac.noToken"));
      return;
    }

    saveTokens(accessToken, refreshToken);
    fetchMe(accessToken)
      .then(async (user) => {
        setUser(user);
        const home = await resolveHomeRoute(user, accessToken);
        const stashed = home.page !== "onboarding" ? consumeStashedRedirect() : null;
        const { page, params: routeParams } = stashed || home;
        nav(page, routeParams);
      })
      .catch(() => setError(t("ac.fetchFailed")));
  }, [nav, setUser]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-6 text-white">
      {error ? (
        <div className="flex flex-col items-center gap-3 text-center">
          <AlertCircle className="h-6 w-6 text-red-400" />
          <p className="text-[14px] text-white/70">{error}</p>
          <button
            onClick={() => nav("auth")}
            className="text-[13px] font-semibold text-brand-soft hover:text-white"
          >
            {t("common.back")}
          </button>
        </div>
      ) : (
        <p className="text-[13px] text-white/50">{t("ac.signingIn")}</p>
      )}
    </div>
  );
}
