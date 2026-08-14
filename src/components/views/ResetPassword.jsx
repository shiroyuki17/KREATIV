import { useEffect, useState } from "react";
import { ArrowLeft, AlertCircle, Check } from "lucide-react";
import { useNav } from "../../nav.jsx";
import { useT } from "../../i18n.jsx";
import { resetPassword } from "../../lib/authApi.js";

export default function ResetPassword() {
  const t = useT();
  const { nav } = useNav();
  const [token, setToken] = useState(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const query = window.location.hash.split("?")[1] || "";
    setToken(new URLSearchParams(query).get("token") || "");
  }, []);

  const mismatch = confirm.length > 0 && password !== confirm;
  const canSubmit = !submitting && password.length >= 8 && password === confirm;

  const submit = async () => {
    setError("");
    setSubmitting(true);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-ink px-6 py-16">
      <div className="w-full max-w-md">
        <button
          onClick={() => nav("auth", { mode: "login" })}
          className="mb-6 inline-flex items-center gap-2 text-[13px] font-medium text-white/50 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("rp.backToLogin")}
        </button>

        <div className="glass rounded-3xl p-8">
          <p className="text-center font-display text-xl font-bold tracking-tight">
            {t("rp.setNewPassword")}
          </p>

          {!token ? (
            <p className="mt-4 flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-[12.5px] font-medium text-red-400">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {t("rp.missingLink")}
            </p>
          ) : done ? (
            <>
              <p className="mt-4 flex items-center gap-2 rounded-xl border border-brand/30 bg-brand/10 px-3.5 py-3 text-[13px] font-medium text-brand-soft">
                <Check className="h-4 w-4 shrink-0" /> {t("rp.done")}
              </p>
              <button
                onClick={() => nav("auth", { mode: "login" })}
                className="mt-6 w-full rounded-xl bg-brand py-3.5 text-[14px] font-semibold text-fg-1 glow-brand transition-all"
              >
                {t("common.logIn")}
              </button>
            </>
          ) : (
            <>
              {error && (
                <p className="mt-4 flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-[12.5px] font-medium text-red-400">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
                </p>
              )}
              <div className="mt-6 space-y-4">
                <label className="block">
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
                    {t("rp.newPassword")}
                  </span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("rp.minChars")}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[14px] outline-none transition-colors placeholder:text-white/25 focus:border-brand/50"
                  />
                </label>
                <label className="block">
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
                    {t("rp.verifyPassword")}
                  </span>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder={t("rp.reenter")}
                    aria-invalid={mismatch}
                    className={`mt-2 w-full rounded-xl border bg-white/[0.04] px-4 py-3 text-[14px] outline-none transition-colors placeholder:text-white/25 ${
                      mismatch ? "border-red-500/60 focus:border-red-500" : "border-white/10 focus:border-brand/50"
                    }`}
                  />
                  {mismatch && (
                    <span className="mt-1.5 flex items-center gap-1.5 text-[11.5px] font-medium text-red-400">
                      <AlertCircle className="h-3.5 w-3.5" /> Passwords don't match
                    </span>
                  )}
                </label>
              </div>
              <button
                onClick={submit}
                disabled={!canSubmit}
                className="mt-6 w-full rounded-xl bg-brand py-3.5 text-[14px] font-semibold text-fg-1 glow-brand transition-all disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
              >
                {submitting ? t("rp.pleaseWait") : t("rp.reset")}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
