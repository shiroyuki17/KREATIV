import { useState } from "react";
import { Briefcase, Laptop, ArrowLeft, Check, AlertCircle } from "lucide-react";
import Magnet from "../fx/Magnet.jsx";
import { useNav } from "../../nav.jsx";
import { googleLoginUrl, registerUser, loginUser, saveTokens, resolveHomeRoute, consumeStashedRedirect } from "../../lib/authApi.js";

const OAUTH_ERROR_MESSAGES = {
  invalid_state: "Google холболт хугацаа дууссан байна. Дахин оролдоно уу.",
  token_exchange_failed: "Google-тэй холбогдоход алдаа гарлаа.",
  invalid_profile: "Google-ээс профайлын мэдээлэл ирсэнгүй.",
  email_unverified:
    "Энэ имэйлтэй акаунт аль хэдийн байна. Google дээрх имэйлээ баталгаажуулаад дахин оролдоно уу.",
  account_disabled: "Энэ акаунт идэвхгүй болгогдсон байна.",
  // Backend талд хүлээгдээгүй алдаа гарсан (жишээ нь өгөгдлийн сан
  // боломжгүй). Өмнө нь ийм үед хэрэглэгч backend-ийн хаяг дээр түүхий
  // JSON хараад гацдаг байсан.
  server_error: "Сервер түр боломжгүй байна. Хэсэг хүлээгээд дахин оролдоно уу.",
};

const ROLES = [
  { id: "client", label: "I'm hiring", desc: "Post briefs & hire talent", Icon: Briefcase },
  { id: "freelancer", label: "I'm freelancing", desc: "Find work & get paid", Icon: Laptop },
];

const PHONE_RE = /^\d{8}$/;

export default function Auth() {
  const { nav, params, setUser } = useNav();
  const oauthError = params?.oauthError && (OAUTH_ERROR_MESSAGES[params.oauthError] || "Google-ээр нэвтрэхэд алдаа гарлаа.");
  const [mode, setMode] = useState(params?.mode === "login" ? "login" : "signup");
  const [role, setRole] = useState("client");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const mismatch = mode === "signup" && confirm.length > 0 && password !== confirm;
  const matched = mode === "signup" && confirm.length > 0 && password === confirm;
  const phoneInvalid = mode === "signup" && phone.length > 0 && !PHONE_RE.test(phone);

  const canSubmit =
    !submitting &&
    (mode === "login"
      ? email.length > 0 && password.length > 0
      : firstName.trim().length > 0 &&
        lastName.trim().length > 0 &&
        email.length > 0 &&
        PHONE_RE.test(phone) &&
        password.length > 0 &&
        password === confirm);

  async function handleSubmit() {
    setFormError("");
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const { user, accessToken, refreshToken } = await registerUser({
          email,
          password,
          name: `${firstName.trim()} ${lastName.trim()}`.trim(),
          phone,
        });
        saveTokens(accessToken, refreshToken);
        setUser(user);
        nav("onboarding", { role, firstName, lastName, email, phone });
        return;
      }

      const { user, accessToken, refreshToken } = await loginUser({ email, password });
      saveTokens(accessToken, refreshToken);
      setUser(user);
      const home = await resolveHomeRoute(user, accessToken);
      // Came here bounced off a gated page (e.g. searched from the Hero bar
      // while logged out) — go back to what they were actually trying to do,
      // unless they still need onboarding first (that always wins).
      const stashed = home.page !== "onboarding" ? consumeStashedRedirect() : null;
      const { page, params: routeParams } = stashed || home;
      nav(page, routeParams);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-6 py-28">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/4 h-[420px] w-[640px] -translate-x-1/2 rounded-full bg-brand/15 blur-[140px]"
      />

      <div className="relative w-full max-w-md">
        <button
          onClick={() => nav("home")}
          className="mb-6 inline-flex items-center gap-2 text-[13px] font-medium text-white/50 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <div className="glass rounded-3xl p-8">
          <p className="text-center font-display text-xl font-bold tracking-tight">
            {mode === "signup" ? "Join " : "Welcome back to "}
            KRE
            <span className="bg-gradient-to-r from-brand-soft to-neon bg-clip-text text-transparent">
              ATIV
            </span>
          </p>
          <p className="mt-1.5 text-center text-[12.5px] text-white/45">
            {mode === "signup"
              ? "Where elite work meets elite talent."
              : "Log in to your workspace."}
          </p>

          {(oauthError || formError) && (
            <p className="mt-4 flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-[12.5px] font-medium text-red-400">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {oauthError || formError}
            </p>
          )}

          {mode === "signup" && (
            <div className="mt-7 grid grid-cols-2 gap-3">
              {ROLES.map(({ id, label, desc, Icon }) => (
                <button
                  key={id}
                  onClick={() => setRole(id)}
                  className={
                    role === id
                      ? "rounded-2xl border border-brand/60 bg-brand/10 p-4 text-left"
                      : "rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition-colors hover:border-white/25"
                  }
                >
                  <Icon className={`h-5 w-5 ${role === id ? "text-brand-soft" : "text-white/50"}`} />
                  <p className="mt-3 text-[13.5px] font-semibold">{label}</p>
                  <p className="mt-0.5 text-[11px] text-white/40">{desc}</p>
                </button>
              ))}
            </div>
          )}

          <div className="mt-6 space-y-4">
            {mode === "signup" && (
              <div className="grid grid-cols-2 gap-3 animate-rise-in">
                <label className="block">
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
                    First name
                  </span>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Aika"
                    className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[14px] outline-none transition-colors placeholder:text-white/25 focus:border-brand/50"
                  />
                </label>
                <label className="block">
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
                    Last name
                  </span>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Bold"
                    className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[14px] outline-none transition-colors placeholder:text-white/25 focus:border-brand/50"
                  />
                </label>
              </div>
            )}

            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
                Email
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@studio.com"
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[14px] outline-none transition-colors placeholder:text-white/25 focus:border-brand/50"
              />
            </label>

            {mode === "signup" && (
              <label className="block animate-rise-in">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
                  Phone number
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 8))}
                  placeholder="8811 2233"
                  aria-invalid={phoneInvalid}
                  className={`mt-2 w-full rounded-xl border bg-white/[0.04] px-4 py-3 text-[14px] outline-none transition-colors placeholder:text-white/25 ${
                    phoneInvalid ? "border-red-500/60 focus:border-red-500" : "border-white/10 focus:border-brand/50"
                  }`}
                />
                {phoneInvalid && (
                  <span className="mt-1.5 flex items-center gap-1.5 text-[11.5px] font-medium text-red-400">
                    <AlertCircle className="h-3.5 w-3.5" /> Enter a valid 8-digit phone number
                  </span>
                )}
              </label>
            )}

            <label className="block">
              <span className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-widest text-white/40">
                Password
                {mode === "login" && (
                  <button className="text-brand-soft normal-case tracking-normal hover:text-white">
                    Forgot?
                  </button>
                )}
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[14px] outline-none transition-colors placeholder:text-white/25 focus:border-brand/50"
              />
            </label>

            {mode === "signup" && (
              <label className="block animate-rise-in">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
                  Verify password
                </span>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Re-enter your password"
                  aria-invalid={mismatch}
                  className={`mt-2 w-full rounded-xl border bg-white/[0.04] px-4 py-3 text-[14px] outline-none transition-colors placeholder:text-white/25 ${
                    mismatch
                      ? "border-red-500/60 focus:border-red-500"
                      : matched
                        ? "border-brand/50"
                        : "border-white/10 focus:border-brand/50"
                  }`}
                />
                {mismatch && (
                  <span className="mt-1.5 flex items-center gap-1.5 text-[11.5px] font-medium text-red-400">
                    <AlertCircle className="h-3.5 w-3.5" /> Passwords don't match
                  </span>
                )}
                {matched && (
                  <span className="mt-1.5 flex items-center gap-1.5 text-[11.5px] font-medium text-brand-soft">
                    <Check className="h-3.5 w-3.5" /> Passwords match
                  </span>
                )}
              </label>
            )}
          </div>

          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="mt-6 w-full rounded-xl bg-brand py-3.5 text-[14px] font-semibold text-fg-1 glow-brand transition-all disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
          >
            {submitting ? "Түр хүлээнэ үү…" : mode === "signup" ? "Create account" : "Log in"}
          </button>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-white/10" />
            <span className="text-[11px] font-medium uppercase tracking-widest text-white/30">
              or
            </span>
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <button
            onClick={() => { window.location.href = googleLoginUrl(); }}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/15 bg-white/[0.05] py-3.5 text-[14px] font-semibold text-white/90 transition-colors hover:border-white/25 hover:bg-white/[0.09]"
          >
            <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
            Continue with Google
          </button>

          <p className="mt-6 text-center text-[12.5px] text-white/45">
            {mode === "signup" ? "Already have an account?" : "New to KREATIV?"}{" "}
            <button
              onClick={() => {
                setMode(mode === "signup" ? "login" : "signup");
                setPassword("");
                setConfirm("");
                setFirstName("");
                setLastName("");
                setEmail("");
                setPhone("");
                setFormError("");
              }}
              className="font-semibold text-brand-soft hover:text-white"
            >
              {mode === "signup" ? "Log in" : "Sign up"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
