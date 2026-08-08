import { useEffect, useRef, useState } from "react";
import { User, Bell, Lock, Check, AlertCircle, Loader2, ShieldCheck, Smartphone } from "lucide-react";
import Magnet from "../fx/Magnet.jsx";
import {
  fetchMe,
  uploadAvatar,
  avatarSrc,
  getAccessToken,
  fetchFreelancerProfile,
  fetchClientProfile,
  saveFreelancerProfile,
  saveClientProfile,
  requestPhoneOtp,
  verifyPhoneOtp,
} from "../../lib/authApi.js";

// FR-1.1 — жинхэнэ SMS gateway байхгүй тул демо горим: backend хариултад
// demoCode-ыг шууд буцаадаг тул автоматаар талбарт бөглөж, ажиллаж байгааг
// шууд харуулна (real gateway ирэхэд энэ мөрийг устгахаас өөр өөрчлөлт хэрэггүй).
function PhoneVerify({ me, onVerified }) {
  const [phone, setPhone] = useState(me?.phone || "");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState("idle"); // idle | sent
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [demoHint, setDemoHint] = useState("");

  if (me?.phoneVerifiedAt) {
    return (
      <p className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-mint">
        <ShieldCheck className="h-4 w-4" /> Утас баталгаажсан ({me.phone})
      </p>
    );
  }

  const sendOtp = async () => {
    if (!/^\d{8}$/.test(phone)) { setError("Утасны дугаар 8 орон байх ёстой"); return; }
    setBusy(true);
    setError("");
    try {
      const res = await requestPhoneOtp(phone, getAccessToken());
      setStage("sent");
      setDemoHint(res.demoCode ? `Демо горим — код: ${res.demoCode}` : "");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setBusy(true);
    setError("");
    try {
      const user = await verifyPhoneOtp(phone, code, getAccessToken());
      onVerified(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-2 rounded-xl border border-white/8 bg-white/[0.03] p-4">
      <p className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-white/70">
        <Smartphone className="h-4 w-4" /> Утас баталгаажаагүй
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))}
          placeholder="99112233"
          disabled={stage === "sent"}
          className="w-40 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[13px] outline-none focus:border-brand/50 disabled:opacity-50"
        />
        {stage === "idle" ? (
          <button onClick={sendOtp} disabled={busy} className="rounded-lg bg-brand px-3.5 py-2 text-[11.5px] font-bold text-ink glow-brand disabled:opacity-50">
            {busy ? "Илгээж байна…" : "Код авах"}
          </button>
        ) : (
          <>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="6 оронтой код"
              className="w-32 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[13px] outline-none focus:border-brand/50"
            />
            <button onClick={verify} disabled={busy || code.length !== 6} className="rounded-lg bg-mint px-3.5 py-2 text-[11.5px] font-bold text-ink disabled:opacity-50">
              {busy ? "Шалгаж байна…" : "Баталгаажуулах"}
            </button>
          </>
        )}
      </div>
      {demoHint && <p className="mt-2 text-[11px] text-amber-300">{demoHint}</p>}
      {error && <p className="mt-2 text-[11.5px] font-medium text-red-400">{error}</p>}
    </div>
  );
}

const TABS = [
  { id: "profile", label: "Profile", Icon: User },
  { id: "notifications", label: "Notifications", Icon: Bell },
  { id: "security", label: "Security", Icon: Lock },
];

function Field({ label, disabled, ...props }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
        {label}
      </span>
      <input
        disabled={disabled}
        {...props}
        className={`mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[14px] outline-none transition-colors placeholder:text-white/25 focus:border-brand/50 ${
          disabled ? "cursor-not-allowed text-white/50" : ""
        }`}
      />
    </label>
  );
}

function Toggle({ label, desc, defaultOn = true }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <button
      onClick={() => setOn(!on)}
      className="flex w-full items-center justify-between gap-4 rounded-xl border border-white/8 bg-white/[0.03] p-4 text-left transition-colors hover:border-white/15"
      role="switch"
      aria-checked={on}
    >
      <span>
        <span className="block text-[13.5px] font-semibold">{label}</span>
        <span className="mt-0.5 block text-[11.5px] text-white/40">{desc}</span>
      </span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          on ? "bg-brand glow-brand" : "bg-white/10"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
            on ? "left-[22px]" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}

export default function Settings() {
  const [tab, setTab] = useState("profile");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [me, setMe] = useState(null);
  const [isFreelancer, setIsFreelancer] = useState(true); // which profile type this account has
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const fileInputRef = useRef(null);

  // Editable fields — seeded from the real fetched profile once it loads
  // (not hardcoded to a fake person), and this is what "Save changes"
  // actually persists.
  const [headline, setHeadline] = useState("");
  const [rate, setRate] = useState("");
  const [bio, setBio] = useState("");
  const [orgName, setOrgName] = useState("");

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    Promise.all([
      fetchMe(token),
      fetchFreelancerProfile(token),
      fetchClientProfile(token),
    ]).then(([user, freelancer, client]) => {
      setMe(user);
      // A user could in principle have both profiles — default to editing
      // whichever one exists; freelancer wins if somehow both do.
      setIsFreelancer(!!freelancer || !client);
      if (freelancer) {
        setHeadline(freelancer.headline || "");
        setBio(freelancer.bio || "");
        setRate(
          freelancer.priceMin != null
            ? freelancer.priceMax && freelancer.priceMax !== freelancer.priceMin
              ? `${freelancer.priceMin}-${freelancer.priceMax}`
              : `${freelancer.priceMin}`
            : ""
        );
      }
      if (client) setOrgName(client.orgName || "");
    });
  }, []);

  const save = async () => {
    const token = getAccessToken();
    if (!token) return;
    setSaving(true);
    setSaveError("");
    try {
      if (isFreelancer) {
        const nums = rate.match(/\d+/g)?.map(Number) || [];
        await saveFreelancerProfile(
          { headline, bio, priceMin: nums[0], priceMax: nums[1] ?? nums[0] },
          token
        );
      } else {
        await saveClientProfile({ orgName }, token);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const pickAvatar = () => {
    setAvatarError("");
    fileInputRef.current?.click();
  };

  const onAvatarSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    if (!["image/png", "image/jpeg"].includes(file.type)) {
      setAvatarError("Зөвхөн PNG эсвэл JPG зураг сонгоно уу");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError("Файлын хэмжээ 2MB-с ихгүй байх ёстой");
      return;
    }
    const token = getAccessToken();
    if (!token) {
      setAvatarError("Зураг солихын тулд эхлээд нэвтэрнэ үү");
      return;
    }

    setAvatarError("");
    setAvatarBusy(true);
    try {
      setMe(await uploadAvatar(file, token));
    } catch (err) {
      setAvatarError(err.message);
    } finally {
      setAvatarBusy(false);
    }
  };

  const avatarUrl = avatarSrc(me?.avatarUrl);
  const initials = me?.name
    ? me.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  return (
    <div className="mx-auto max-w-4xl px-6 pb-24 pt-8">
      <h1 className="font-display text-3xl font-bold tracking-tight">Settings</h1>

      <div className="mt-7 flex flex-wrap gap-2">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={
              tab === id
                ? "inline-flex items-center gap-2 rounded-xl bg-brand px-4.5 py-2.5 text-[13px] font-semibold glow-brand"
                : "glass inline-flex items-center gap-2 rounded-xl px-4.5 py-2.5 text-[13px] font-medium text-white/55 transition-colors hover:text-white"
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      <div className="glass mt-6 rounded-2xl p-7">
        {tab === "profile" && (
          <div className="space-y-5">
            <div className="flex items-center gap-5">
              <span className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-brand font-display text-lg font-bold">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  initials
                )}
                {avatarBusy && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <Loader2 className="h-5 w-5 animate-spin text-white" />
                  </span>
                )}
              </span>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={onAvatarSelected}
                  className="hidden"
                />
                <button
                  onClick={pickAvatar}
                  disabled={avatarBusy}
                  className="glass rounded-lg px-4 py-2 text-[12px] font-semibold text-white/80 transition-colors hover:border-white/25 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {avatarBusy ? "Uploading…" : "Change avatar"}
                </button>
                <p className="mt-1.5 text-[11px] text-white/35">PNG or JPG, max 2MB</p>
                {avatarError && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-red-400">
                    <AlertCircle className="h-3.5 w-3.5" /> {avatarError}
                  </p>
                )}
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label="Full name"
                value={me?.name || ""}
                disabled
                title="Contact support to change your name"
              />
              <Field
                label="Email"
                value={me?.email || ""}
                disabled
              />
              {isFreelancer ? (
                <>
                  <Field
                    label="Professional title"
                    placeholder="e.g. Senior Product Designer"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                  />
                  <Field
                    label="Hourly rate (USD)"
                    placeholder="e.g. 85 or 70-90"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                  />
                </>
              ) : (
                <Field
                  label="Organization name"
                  placeholder="e.g. Nova Studio"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                />
              )}
            </div>
            {isFreelancer && (
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
                  Bio
                </span>
                <textarea
                  rows={4}
                  placeholder="Tell clients what you do best…"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[14px] outline-none transition-colors placeholder:text-white/25 focus:border-brand/50"
                />
              </label>
            )}
          </div>
        )}

        {tab === "notifications" && (
          <div className="space-y-3">
            <Toggle label="New project invites" desc="Get notified the moment a client invites you" />
            <Toggle label="Milestone updates" desc="Escrow funding, approvals, and releases" />
            <Toggle label="Messages" desc="Real-time alerts for new messages" />
            <Toggle label="AI match digest" desc="A daily digest of briefs matched to your skills" defaultOn={false} />
          </div>
        )}

        {tab === "security" && (
          <div className="space-y-5">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
                Утасны баталгаажуулалт
              </span>
              <PhoneVerify me={me} onVerified={(user) => setMe(user)} />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Current password" type="password" placeholder="••••••••" />
              <Field label="New password" type="password" placeholder="Min. 12 characters" />
            </div>
            <Toggle label="Two-factor authentication" desc="Require a code from your authenticator app" />
            <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
              <p className="text-[13px] font-semibold">Active sessions</p>
              <p className="mt-1.5 text-[12px] text-white/45">
                Windows · Chrome · Ulaanbaatar — <span className="text-mint">this device</span>
              </p>
            </div>
          </div>
        )}

        <div className="mt-7 flex flex-wrap items-center gap-4 border-t border-white/8 pt-6">
          <Magnet strength={0.15}>
            <button
              onClick={save}
              disabled={saving}
              className="rounded-xl bg-brand px-6 py-3 text-[13.5px] font-semibold glow-brand transition-shadow disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </Magnet>
          {saved && (
            <span className="inline-flex animate-feed-in items-center gap-1.5 text-[13px] font-semibold text-mint">
              <Check className="h-4 w-4" />
              Saved
            </span>
          )}
          {saveError && (
            <span className="inline-flex animate-feed-in items-center gap-1.5 text-[13px] font-semibold text-red-400">
              <AlertCircle className="h-4 w-4" />
              {saveError}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
