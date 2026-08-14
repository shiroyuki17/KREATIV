import { useEffect, useRef, useState } from "react";
import { User, Bell, Lock, Check, AlertCircle, Loader2, ShieldCheck, Smartphone, Image as ImageIcon, Plus, X, Link as LinkIcon, Tag, Clock } from "lucide-react";
import Magnet from "../fx/Magnet.jsx";
import { useNav } from "../../nav.jsx";
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
  requestFreelancerVerification,
  uploadPortfolioImage,
  createPortfolioItem,
  deletePortfolioItem,
  avatarSrc as fileSrc,
  updateAccountName,
  updateUsername,
  fetchSessions,
  revokeOtherSessions,
} from "../../lib/authApi.js";
import { fetchMyGigs, uploadGigImage, createGig, updateGig, deleteGig } from "../../lib/gigApi.js";
import { fetchNotificationPrefs, saveNotificationPrefs } from "../../lib/notificationsApi.js";

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
          <button onClick={sendOtp} disabled={busy} className="rounded-lg bg-brand px-3.5 py-2 text-[11.5px] font-bold text-fg-1 glow-brand disabled:opacity-50">
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

// FR-5.1: Verified badge — freelancer portfolio/ажлын жишээгээ илгээж, админ
// гараар хянаж баталгаажуулна (шууд/автомат баталгаажуулалт биш).
function VerificationBadge({ profile, onUpdated }) {
  const [evidence, setEvidence] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const status = profile?.verificationStatus || "NONE";

  if (status === "VERIFIED") {
    return (
      <p className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-mint">
        <ShieldCheck className="h-4 w-4" /> Verified badge идэвхтэй — профайл дээр харагдана
      </p>
    );
  }
  if (status === "PENDING") {
    return (
      <p className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-amber-300">
        <Loader2 className="h-4 w-4" /> Хүсэлт хянагдаж байна — админ шалгаад мэдэгдэнэ
      </p>
    );
  }

  const submit = async () => {
    if (evidence.trim().length < 20) { setError("Дор хаяж 20 тэмдэгт бичнэ үү (portfolio холбоос + богино тайлбар)"); return; }
    setBusy(true);
    setError("");
    try {
      const res = await requestFreelancerVerification(evidence);
      onUpdated({ ...profile, verificationStatus: res.verificationStatus });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-2 rounded-xl border border-white/8 bg-white/[0.03] p-4">
      {status === "REJECTED" && (
        <p className="mb-3 text-[12px] text-red-400">
          Өмнөх хүсэлт татгалзагдсан{profile?.verificationNote ? `: ${profile.verificationNote}` : ""} — дахин илгээж болно.
        </p>
      )}
      <p className="text-[12.5px] font-semibold text-white/70">Portfolio холбоос болон товч тайлбараа бичнэ үү</p>
      <textarea
        value={evidence}
        onChange={(e) => setEvidence(e.target.value)}
        rows={3}
        placeholder="жишээ нь: behance.net/miniy-huudas — сүүлийн 2 жил UI/UX хийж байна, X, Y, Z төслүүд..."
        className="mt-2 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[13px] outline-none focus:border-brand/50"
      />
      <button onClick={submit} disabled={busy} className="mt-2 rounded-lg bg-brand px-3.5 py-2 text-[11.5px] font-bold text-fg-1 glow-brand disabled:opacity-50">
        {busy ? "Илгээж байна…" : "Баталгаажуулахыг хүсэх"}
      </button>
      {error && <p className="mt-2 text-[11.5px] font-medium text-red-400">{error}</p>}
    </div>
  );
}

// Portfolio удирдлага — жагсаалт + шинэ ажлын жишээ нэмэх (зураг эхлээд
// тусад нь upload хийгээд URL авна, дараа нь item үүсгэхэд дамжуулна).
function PortfolioManager({ items, onAdd, onRemove }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [link, setLink] = useState("");
  const [imageUrls, setImageUrls] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [removingId, setRemovingId] = useState(null);
  const fileRef = useRef(null);

  const pickImage = () => fileRef.current?.click();

  const onImageSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const { url } = await uploadPortfolioImage(file);
      setImageUrls((arr) => [...arr, url]);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (!title.trim()) { setError("Гарчиг оруулна уу"); return; }
    setSaving(true);
    setError("");
    try {
      const item = await createPortfolioItem({
        title: title.trim(),
        description: description.trim() || undefined,
        link: link.trim() || undefined,
        images: imageUrls,
      });
      onAdd(item);
      setTitle("");
      setDescription("");
      setLink("");
      setImageUrls([]);
    } catch (err) {
      setError(Array.isArray(err.message) ? err.message.join(", ") : err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    setRemovingId(id);
    try {
      await deletePortfolioItem(id);
      onRemove(id);
    } catch (err) {
      setError(err.message);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {items.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((p) => (
            <div key={p.id} className="group relative overflow-hidden rounded-xl border border-white/8 bg-white/[0.03]">
              <button
                onClick={() => remove(p.id)}
                disabled={removingId === p.id}
                aria-label="Устгах"
                className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white opacity-0 backdrop-blur transition-opacity hover:bg-red-500 disabled:opacity-100 group-hover:opacity-100"
              >
                {removingId === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
              </button>
              {p.images?.[0] ? (
                <img src={fileSrc(p.images[0])} alt="" className="h-36 w-full object-cover" />
              ) : (
                <div className="flex h-36 w-full items-center justify-center bg-white/[0.02] text-white/20">
                  <ImageIcon className="h-8 w-8" />
                </div>
              )}
              <div className="p-3.5">
                <p className="text-[13px] font-semibold">{p.title}</p>
                {p.description && <p className="mt-1 line-clamp-2 text-[11.5px] text-white/45">{p.description}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-white/8 bg-white/[0.03] p-5">
        <p className="text-[12.5px] font-semibold text-white/70">Шинэ ажлын жишээ нэмэх</p>

        <div className="mt-3 flex flex-wrap gap-2">
          {imageUrls.map((url, i) => (
            <div key={i} className="relative h-16 w-16 overflow-hidden rounded-lg border border-white/10">
              <img src={fileSrc(url)} alt="" className="h-full w-full object-cover" />
              <button
                onClick={() => setImageUrls((arr) => arr.filter((_, j) => j !== i))}
                className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity hover:opacity-100"
              >
                <X className="h-4 w-4 text-white" />
              </button>
            </div>
          ))}
          <input ref={fileRef} type="file" accept="image/png,image/jpeg" onChange={onImageSelected} className="hidden" />
          <button
            onClick={pickImage}
            disabled={uploading || imageUrls.length >= 10}
            className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-white/15 text-white/40 transition-colors hover:border-brand/40 hover:text-brand-soft disabled:cursor-not-allowed disabled:opacity-40"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </button>
        </div>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Гарчиг — e.g. Checkout flow revamp"
          className="mt-3 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[13px] outline-none focus:border-brand/50"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Товч тайлбар (заавал биш)"
          className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[13px] outline-none focus:border-brand/50"
        />
        <div className="mt-2 flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2">
          <LinkIcon className="h-3.5 w-3.5 shrink-0 text-white/30" />
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="Холбоос (заавал биш) — https://…"
            className="w-full bg-transparent text-[13px] outline-none"
          />
        </div>

        <button
          onClick={submit}
          disabled={saving || uploading}
          className="mt-3 rounded-lg bg-brand px-4 py-2 text-[12.5px] font-bold text-fg-1 glow-brand disabled:opacity-50"
        >
          {saving ? "Хадгалж байна…" : "Portfolio-д нэмэх"}
        </button>
        {error && <p className="mt-2 text-[11.5px] font-medium text-red-400">{error}</p>}
      </div>
    </div>
  );
}

const TABS = [
  { id: "profile", label: "Profile", Icon: User },
  { id: "portfolio", label: "Portfolio", Icon: ImageIcon, freelancerOnly: true },
  // "My Services" таб энд байсныг хассан — үйлчилгээ нэмэх/удирдах нь одоо
  // Services хуудсан дээрээ байна (жагсаалтаа хараад тэндээсээ нэмэх нь
  // Settings руу орохоос зөв). Хоёр газар давхардуулах шаардлагагүй.
  { id: "notifications", label: "Notifications", Icon: Bell },
  { id: "security", label: "Security", Icon: Lock },
];

const GIG_CATEGORIES = ["Design", "Dev", "AI", "Motion", "Writing", "Marketing"];

// Gig удирдлага — Fiverr-маягийн fixed-price үйлчилгээ жагсаах/устгах.
function GigManager() {
  const [gigs, setGigs] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(GIG_CATEGORIES[0]);
  const [price, setPrice] = useState("");
  const [deliveryDays, setDeliveryDays] = useState("");
  const [imageUrls, setImageUrls] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    fetchMyGigs().then((res) => setGigs(res.gigs)).catch(() => setGigs([]));
  }, []);

  const onImageSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const { url } = await uploadGigImage(file);
      setImageUrls((arr) => [...arr, url]);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    setError("");
    if (title.trim().length < 5) { setError("Гарчиг дор хаяж 5 тэмдэгт"); return; }
    if (description.trim().length < 20) { setError("Тайлбар дор хаяж 20 тэмдэгт"); return; }
    const priceNum = Number(price);
    const daysNum = Number(deliveryDays);
    if (!priceNum || priceNum <= 0) { setError("Үнэ зөв тоо байх ёстой"); return; }
    if (!daysNum || daysNum <= 0) { setError("Хугацаа зөв тоо байх ёстой"); return; }

    setSaving(true);
    try {
      const gig = await createGig({
        title: title.trim(),
        description: description.trim(),
        category,
        price: priceNum,
        deliveryDays: daysNum,
        images: imageUrls,
      });
      setGigs((arr) => [gig, ...(arr || [])]);
      setTitle(""); setDescription(""); setPrice(""); setDeliveryDays(""); setImageUrls([]);
    } catch (err) {
      setError(Array.isArray(err.message) ? err.message.join(", ") : err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (gig) => {
    setBusyId(gig.id);
    try {
      const updated = await updateGig(gig.id, { active: !gig.active });
      setGigs((arr) => arr.map((g) => (g.id === gig.id ? updated : g)));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id) => {
    setBusyId(id);
    try {
      await deleteGig(id);
      setGigs((arr) => arr.filter((g) => g.id !== id));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  if (gigs === null) {
    return <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-brand-soft" /></div>;
  }

  return (
    <div className="space-y-6">
      {gigs.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {gigs.map((g) => (
            <div key={g.id} className="overflow-hidden rounded-xl border border-white/8 bg-white/[0.03]">
              {g.images?.[0] ? (
                <img src={fileSrc(g.images[0])} alt="" className="h-32 w-full object-cover" />
              ) : (
                <div className="flex h-32 w-full items-center justify-center bg-white/[0.02] text-white/20">
                  <ImageIcon className="h-7 w-7" />
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[13px] font-semibold">{g.title}</p>
                  <span className="shrink-0 font-display text-[14px] font-bold text-mint">${g.price}</span>
                </div>
                <p className="mt-1 flex items-center gap-1.5 text-[11px] text-white/40">
                  <Clock className="h-3 w-3" /> {g.deliveryDays}d · {g.category}
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => toggleActive(g)}
                    disabled={busyId === g.id}
                    className={`flex-1 rounded-lg px-3 py-1.5 text-[11.5px] font-semibold transition-colors disabled:opacity-50 ${
                      g.active ? "border border-white/12 text-white/60 hover:border-white/25" : "bg-brand text-fg-1"
                    }`}
                  >
                    {g.active ? "Идэвхгүй болгох" : "Идэвхжүүлэх"}
                  </button>
                  <button
                    onClick={() => remove(g.id)}
                    disabled={busyId === g.id}
                    className="rounded-lg border border-red-400/30 px-3 py-1.5 text-[11.5px] font-semibold text-red-300 transition-colors hover:bg-red-400/10 disabled:opacity-50"
                  >
                    Устгах
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-white/8 bg-white/[0.03] p-5">
        <p className="text-[12.5px] font-semibold text-white/70">Шинэ үйлчилгээ нэмэх</p>

        <div className="mt-3 flex flex-wrap gap-2">
          {imageUrls.map((url, i) => (
            <div key={i} className="relative h-16 w-16 overflow-hidden rounded-lg border border-white/10">
              <img src={fileSrc(url)} alt="" className="h-full w-full object-cover" />
              <button
                onClick={() => setImageUrls((arr) => arr.filter((_, j) => j !== i))}
                className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity hover:opacity-100"
              >
                <X className="h-4 w-4 text-white" />
              </button>
            </div>
          ))}
          <input ref={fileRef} type="file" accept="image/png,image/jpeg" onChange={onImageSelected} className="hidden" />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading || imageUrls.length >= 10}
            className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-white/15 text-white/40 transition-colors hover:border-brand/40 hover:text-brand-soft disabled:cursor-not-allowed disabled:opacity-40"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </button>
        </div>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder='Гарчиг — e.g. "I will design a modern minimalist logo"'
          className="mt-3 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[13px] outline-none focus:border-brand/50"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Юу багтдаг, хэдэн засвар орно, гэх мэт дэлгэрэнгүй"
          className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[13px] outline-none focus:border-brand/50"
        />
        <div className="mt-2 grid grid-cols-3 gap-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[13px] outline-none focus:border-brand/50 [&>option]:bg-[#1b1730]"
          >
            {GIG_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="Үнэ ($)"
            className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[13px] outline-none focus:border-brand/50"
          />
          <input
            value={deliveryDays}
            onChange={(e) => setDeliveryDays(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="Хугацаа (өдөр)"
            className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[13px] outline-none focus:border-brand/50"
          />
        </div>

        <button
          onClick={submit}
          disabled={saving || uploading}
          className="mt-3 rounded-lg bg-brand px-4 py-2 text-[12.5px] font-bold text-fg-1 glow-brand disabled:opacity-50"
        >
          {saving ? "Хадгалж байна…" : "Үйлчилгээ нэмэх"}
        </button>
        {error && <p className="mt-2 text-[11.5px] font-medium text-red-400">{error}</p>}
      </div>
    </div>
  );
}

// Хуваалцах боломжтой профайлын хаяг. Бүртгүүлэхэд нэрнээс автоматаар
// үүсдэг тул энд зөвхөн засварлана.
function UsernameField({ me, onSaved }) {
  const [value, setValue] = useState(me?.username || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => { setValue(me?.username || ""); }, [me?.username]);

  const shareUrl = me?.username ? `${window.location.origin}/#/u/${me.username}` : "";

  const save = async () => {
    setBusy(true); setError(""); setSaved(false);
    try {
      onSaved(await updateUsername(value.trim().toLowerCase()));
      setSaved(true);
    } catch (err) {
      setError(Array.isArray(err.message) ? err.message.join(", ") : err.message);
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* clipboard хориотой орчин — товч зүгээр л юу ч хийхгүй */ }
  };

  return (
    <div className="mb-5 rounded-xl border border-white/8 bg-white/[0.03] p-4">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
        Профайлын хаяг
      </span>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-[13px] text-white/35">/#/u/</span>
        <input
          value={value}
          onChange={(e) => { setValue(e.target.value); setSaved(false); }}
          placeholder="bat-erdene"
          className="w-52 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[13px] outline-none transition-colors placeholder:text-white/25 focus:border-brand/50"
        />
        <button
          onClick={save}
          disabled={busy || !value.trim() || value.trim().toLowerCase() === me?.username}
          className="rounded-lg bg-brand px-3.5 py-2 text-[12px] font-bold text-fg-1 glow-brand disabled:opacity-40"
        >
          {busy ? "Хадгалж байна…" : "Хадгалах"}
        </button>
        {saved && <span className="text-[12px] font-semibold text-mint">Хадгаллаа</span>}
      </div>
      {error && <p className="mt-2 text-[11.5px] font-medium text-red-400">{error}</p>}
      {shareUrl && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-lg bg-white/[0.04] px-2.5 py-1.5 text-[11.5px] text-white/55">
            {shareUrl}
          </code>
          <button
            onClick={copy}
            className="rounded-lg border border-white/12 px-3 py-1.5 text-[11.5px] font-semibold text-white/70 transition-colors hover:border-white/25 hover:text-white"
          >
            {copied ? "Хуулагдлаа" : "Хуулах"}
          </button>
        </div>
      )}
    </div>
  );
}

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

// Сервер дээр бодитоор хадгалагддаг мэдэгдлийн тохиргоо. Өмнө нь эдгээр
// toggle-ууд зөвхөн локал useState байсан тул хуудсаа refresh хийхэд л
// сэргэдэг, ямар ч мэдэгдлийг хаадаггүй байв. "AI match digest" гэсэн
// дөрөв дэх toggle-ыг хассан: тийм digest илгээдэг код системд байхгүй.
function NotificationPrefs() {
  const [prefs, setPrefs] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchNotificationPrefs()
      .then(setPrefs)
      .catch((err) => setError(err.message));
  }, []);

  // Тэр дор нь UI-г сольж (optimistic), сервер унавал эргүүлж буцаана.
  async function toggle(field) {
    const next = !prefs[field];
    setPrefs((p) => ({ ...p, [field]: next }));
    setError("");
    try {
      await saveNotificationPrefs({ [field]: next });
    } catch (err) {
      setPrefs((p) => ({ ...p, [field]: !next }));
      setError(err.message);
    }
  }

  if (error && !prefs) {
    return <p className="text-[13px] text-red-400">{error}</p>;
  }
  if (!prefs) {
    return <p className="text-[13px] text-white/40">Ачааллаж байна…</p>;
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-[12.5px] text-red-400">{error}</p>}
      <Toggle
        label="New project invites"
        desc="Get notified the moment a client invites you"
        on={prefs.notifyInvites}
        onToggle={() => toggle("notifyInvites")}
      />
      <Toggle
        label="Milestone updates"
        desc="Escrow funding, approvals, and releases"
        on={prefs.notifyMilestones}
        onToggle={() => toggle("notifyMilestones")}
      />
      <Toggle
        label="Messages"
        desc="Real-time alerts for new messages"
        on={prefs.notifyMessages}
        onToggle={() => toggle("notifyMessages")}
      />
      <p className="pt-1 text-[11.5px] text-white/35">
        Төлбөр, үнэлгээ, маргааны мэдэгдлийг хаах боломжгүй.
      </p>
    </div>
  );
}

// Бодит session-ууд (RefreshToken мөр тутам нэг). User-Agent/IP хадгалдаггүй
// тул төхөөрөмжийн нэр/хот зохиохгүй — зөвхөн бодитоор мэдэх зүйлээ харуулна.
function ActiveSessions() {
  const [sessions, setSessions] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = () => fetchSessions().then((r) => setSessions(r.sessions)).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  async function revokeOthers() {
    setBusy(true);
    setError("");
    try {
      await revokeOtherSessions();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
      <p className="text-[13px] font-semibold">Active sessions</p>
      {error && <p className="mt-1.5 text-[12px] text-red-400">{error}</p>}
      {sessions == null ? (
        <p className="mt-1.5 text-[12px] text-white/40">Ачааллаж байна…</p>
      ) : (
        <>
          <p className="mt-1.5 text-[12px] text-white/45">
            {sessions.length} нэвтэрсэн төхөөрөмж
          </p>
          <div className="mt-2.5 space-y-1">
            {sessions.map((s) => (
              <p key={s.id} className="text-[11.5px] text-white/35">
                Нэвтэрсэн: {new Date(s.createdAt).toLocaleString("mn-MN")}
              </p>
            ))}
          </div>
          {sessions.length > 1 && (
            <button
              onClick={revokeOthers}
              disabled={busy}
              className="mt-3 rounded-lg border border-white/12 bg-white/[0.04] px-3.5 py-2 text-[12px] font-semibold text-white/75 transition-colors hover:border-white/25 hover:text-white disabled:opacity-50"
            >
              {busy ? "Гаргаж байна…" : "Бусад төхөөрөмжөөс гарах"}
            </button>
          )}
        </>
      )}
    </div>
  );
}

function Toggle({ label, desc, on, onToggle }) {
  return (
    <button
      onClick={onToggle}
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
  // Нэр солиход sidebar/topbar дээрх нэр шууд шинэчлэгдэхийн тулд.
  const { setUser } = useNav();
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
  const [fullName, setFullName] = useState("");
  const [headline, setHeadline] = useState("");
  const [rate, setRate] = useState("");
  const [bio, setBio] = useState("");
  const [availability, setAvailability] = useState("OPEN");
  const [orgName, setOrgName] = useState("");
  const [freelancerProfile, setFreelancerProfile] = useState(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    Promise.all([
      fetchMe(token),
      fetchFreelancerProfile(token),
      fetchClientProfile(token),
    ]).then(([user, freelancer, client]) => {
      setMe(user);
      setFullName(user?.name || "");
      // A user could in principle have both profiles — default to editing
      // whichever one exists; freelancer wins if somehow both do.
      setIsFreelancer(!!freelancer || !client);
      if (freelancer) {
        setFreelancerProfile(freelancer);
        setHeadline(freelancer.headline || "");
        setAvailability(freelancer.availability || "OPEN");
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
      // Нэр өөрчлөгдсөн бол эхлээд түүнийг хадгална — User.name нь
      // freelancer/client профайлаас тусдаа мөр тул тусад нь дуудна.
      const trimmedName = fullName.trim();
      if (trimmedName && trimmedName !== me?.name) {
        const updated = await updateAccountName(trimmedName);
        setMe((prev) => ({ ...prev, name: updated.name }));
        setUser((prev) => (prev ? { ...prev, name: updated.name } : prev));
      }

      if (isFreelancer) {
        const nums = rate.match(/\d+/g)?.map(Number) || [];
        await saveFreelancerProfile(
          { headline, bio, availability, priceMin: nums[0], priceMax: nums[1] ?? nums[0] },
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
      const updated = await uploadAvatar(file, token);
      setMe(updated);
      // Толгой хэсэг/sidebar нь nav-ийн `user`-ыг уншдаг тул түүнийг
      // шинэчлэхгүй бол зураг зөвхөн энэ хуудсан дээр солигдож, дахин
      // ачаалах хүртэл хуучин хэвээр харагдана.
      setUser((prev) => (prev ? { ...prev, avatarUrl: updated.avatarUrl } : prev));
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
        {TABS.filter((t) => !t.freelancerOnly || isFreelancer).map(({ id, label, Icon }) => (
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
            <UsernameField me={me} onSaved={(u) => { setMe(u); setUser((p) => (p ? { ...p, username: u.username } : p)); }} />

            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label="Full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Таны нэр"
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
                  {/* Ажил авах боломж — профайл дээр өнгөт цэгээр харагдана.
                      Захиалагч чөлөөтэй эсэхийг мэдэхгүй бол ихэвчлэн
                      бичихээ ч болиод өөр хүн рүү шилждэг. */}
                  <div className="sm:col-span-2">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
                      Ажлын боломж
                    </span>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {[
                        ["OPEN", "Ажил авч байна"],
                        ["BUSY", "Ачаалалтай"],
                        ["CLOSED", "Ажил авахгүй"],
                      ].map(([key, label]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setAvailability(key)}
                          className={
                            availability === key
                              ? "rounded-xl border border-brand/60 bg-brand/15 px-4 py-2.5 text-[12.5px] font-semibold text-brand-soft"
                              : "rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-[12.5px] font-medium text-white/55 transition-colors hover:border-white/25 hover:text-white"
                          }
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
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

        {tab === "portfolio" && isFreelancer && (
          freelancerProfile ? (
            <PortfolioManager
              items={freelancerProfile.portfolio || []}
              onAdd={(item) => setFreelancerProfile((p) => ({ ...p, portfolio: [...(p.portfolio || []), item] }))}
              onRemove={(id) => setFreelancerProfile((p) => ({ ...p, portfolio: (p.portfolio || []).filter((i) => i.id !== id) }))}
            />
          ) : (
            <p className="text-[13px] text-white/45">Эхлээд "Profile" tab дээрээ мэдээллээ хадгална уу.</p>
          )
        )}

        {tab === "notifications" && <NotificationPrefs />}

        {tab === "security" && (
          <div className="space-y-5">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
                Утасны баталгаажуулалт
              </span>
              <PhoneVerify me={me} onVerified={(user) => setMe(user)} />
            </div>
            {isFreelancer && freelancerProfile && (
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
                  Verified badge
                </span>
                <VerificationBadge profile={freelancerProfile} onUpdated={setFreelancerProfile} />
              </div>
            )}
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Current password" type="password" placeholder="••••••••" />
              <Field label="New password" type="password" placeholder="Min. 12 characters" />
            </div>
            {/* "Two-factor authentication" toggle-ыг ХАССАН: ямар ч TOTP/SMS
                хэрэгжилт байхгүй байсан тул хэрэглэгч уншаад "хамгаалалт
                асаалаа" гэж бодох боловч бодитоор юу ч болдоггүй байв.
                Байхгүй хамгаалалтыг байгаа мэт харуулахаас хасах нь дээр.

                "Active sessions" нь "Windows · Chrome · Ulaanbaatar" гэсэн
                хатуу бичсэн зохиомол мөр байв — хэн ямар төхөөрөмжөөс
                орсноос үл хамааран ижил харагдана. Одоо RefreshToken-оос
                бодит session-уудыг харуулна. */}
            <ActiveSessions />
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
