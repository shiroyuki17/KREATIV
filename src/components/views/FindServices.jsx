import { useEffect, useRef, useState } from "react";
import { Search, Star, SlidersHorizontal, ChevronLeft, ChevronRight, AlertCircle, BadgeCheck, Clock, ImageIcon, Plus, X, Loader2 } from "lucide-react";
import { useNav } from "../../nav.jsx";
import { useT } from "../../i18n.jsx";
import { avatarSrc } from "../../lib/authApi.js";
import { fetchGigs, createGig, uploadGigImage, fetchMyGigs, updateGig, deleteGig } from "../../lib/gigApi.js";
import { CardGridSkeleton } from "../ui/Skeleton.jsx";
import Select from "../ui/Select.jsx";
import { useEscapeKey } from "../../hooks/useEscapeKey.js";

const CATS = ["All", "Design", "Dev", "AI", "Motion", "Writing", "Marketing"];
const SORTS = {
  relevant: "sv.sortRelevant",
  newest: "sv.sortNewest",
  priceLow: "sv.sortPriceLow",
  priceHigh: "sv.sortPriceHigh",
};

function initialsOf(name) {
  return (name || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

function GigCard({ g, nav, i = 0 }) {
  const t = useT();
  return (
    <button
      onClick={() => nav("gig", { id: g.id })}
      style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}
      className="glass group animate-rise-in overflow-hidden rounded-2xl text-left transition-transform duration-300 hover:-translate-y-0.5 hover:scale-[1.015]"
    >
      {g.images?.[0] ? (
        <img src={avatarSrc(g.images[0])} alt="" className="h-40 w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]" />
      ) : (
        <div className="flex h-40 w-full items-center justify-center bg-white/[0.02] text-white/15">
          <ImageIcon className="h-9 w-9" />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand text-[9px] font-bold">
            {g.freelancer.avatarUrl ? (
              <img src={avatarSrc(g.freelancer.avatarUrl)} alt="" className="h-full w-full object-cover" />
            ) : (
              initialsOf(g.freelancer.name)
            )}
          </span>
          <span className="truncate text-[12px] font-medium text-white/60">{g.freelancer.name}</span>
          {g.freelancer.verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-neon" />}
        </div>
        <p className="mt-2.5 line-clamp-2 text-[13.5px] font-semibold leading-snug">{g.title}</p>
        <div className="mt-3 flex items-center justify-between border-t border-white/8 pt-3">
          <span className="flex items-center gap-1 text-[11px] text-white/40">
            <Clock className="h-3.5 w-3.5" /> {t("sv.deliveryDays", { n: g.deliveryDays })}
          </span>
          {g.reviewCount > 0 ? (
            <span className="flex items-center gap-1 text-[11px] font-bold text-amber-400">
              <Star className="h-3 w-3 fill-amber-400" /> {g.ratingAvg.toFixed(1)} ({g.reviewCount})
            </span>
          ) : g.freelancer.ratingAvg > 0 ? (
            <span className="flex items-center gap-1 text-[11px] font-bold text-amber-400">
              <Star className="h-3 w-3 fill-amber-400" /> {g.freelancer.ratingAvg.toFixed(1)}
            </span>
          ) : null}
        </div>
        <div className="mt-1.5 flex items-center justify-between">
          {g.ordersCount > 0 ? (
            <span className="text-[10.5px] text-white/35">{t("sv.ordered", { n: g.ordersCount })}</span>
          ) : <span />}
        </div>
        <p className="mt-1.5 text-right font-display text-[16px] font-bold text-mint">${g.price}</p>
      </div>
    </button>
  );
}

const GIG_CATEGORIES = ["Design", "Dev", "AI", "Motion", "Writing", "Marketing"];

// Settings.jsx-ийн Field component-тэй ижил хэв маяг — сайт даяар формын
// label/input нэг л харагдалттай байх ёстой.
const LABEL = "text-[11px] font-semibold uppercase tracking-widest text-white/40";
const INPUT =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[14px] outline-none transition-colors placeholder:text-white/25 focus:border-brand/50";

// Үйлчилгээ нэмэх модал. Settings → My Services-ийн формтой ижил
// талбарууд, ижил validation — гэхдээ хэрэглэгч зар үзэж байгаа хуудсаа
// орхихгүйгээр нэмнэ.
function CreateGigModal({ onClose, onCreated }) {
  const t = useT();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(GIG_CATEGORIES[0]);
  const [price, setPrice] = useState("");
  const [deliveryDays, setDeliveryDays] = useState("");
  const [imageUrls, setImageUrls] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);
  useEscapeKey(onClose, true);

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
    if (title.trim().length < 5) { setError(t("sv.titleTooShort")); return; }
    if (description.trim().length < 20) { setError(t("sv.descTooShort")); return; }
    const priceNum = Number(price);
    const daysNum = Number(deliveryDays);
    if (!priceNum || priceNum <= 0) { setError(t("sv.priceInvalid")); return; }
    if (!daysNum || daysNum <= 0) { setError(t("sv.daysInvalid")); return; }

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
      onCreated(gig);
    } catch (err) {
      setError(Array.isArray(err.message) ? err.message.join(", ") : err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-gig-title"
        onClick={(e) => e.stopPropagation()}
        className="glass max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-2xl p-6"
      >
        <div className="flex items-center justify-between">
          <p id="create-gig-title" className="text-[15px] font-bold">{t("sv.newService")}</p>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-white/45 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <p className="mt-3 flex items-start gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-[12.5px] font-medium text-red-400">
            <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" /> {error}
          </p>
        )}

        <div className="mt-5 space-y-5">
          <div>
            <p className={LABEL}>{t("sv.images")}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {imageUrls.map((u) => (
                <div key={u} className="relative">
                  <img src={avatarSrc(u)} alt="" className="h-[68px] w-[68px] rounded-xl object-cover" />
                  <button
                    onClick={() => setImageUrls((arr) => arr.filter((x) => x !== u))}
                    aria-label={t("sv.removeImage")}
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-white/15 bg-[#1b1730] text-white/60 transition-colors hover:text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex h-[68px] w-[68px] flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-white/20 text-white/40 transition-colors hover:border-brand/50 hover:text-white/70 disabled:opacity-50"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {!uploading && <span className="text-[9.5px] font-medium">{t("sv.add")}</span>}
              </button>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg" onChange={onImageSelected} className="hidden" />
            </div>
            <p className="mt-1.5 text-[11px] text-white/30">{t("sv.imageHint")}</p>
          </div>

          <label className="block">
            <span className={LABEL}>{t("sv.gigTitle")}</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("sv.gigTitlePlaceholder")}
              className={`${INPUT} mt-2`}
            />
          </label>

          <label className="block">
            <span className={LABEL}>Тайлбар</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder={t("sv.gigDescPlaceholder")}
              className={`${INPUT} mt-2 resize-none`}
            />
            <span className="mt-1.5 block text-[11px] text-white/30">{t("sv.minChars", { n: description.trim().length })}</span>
          </label>

          <div>
            <p className={LABEL}>{t("sv.category")}</p>
            <div className="mt-2">
              {/* Native <select>-ийн оронд custom Select: browser-ийн
                  өгөгдмөл цагаан dropdown нь бараан theme-тэй зөрчилддөг. */}
              <Select
                value={category}
                onChange={setCategory}
                options={GIG_CATEGORIES.map((c) => ({ value: c, label: t(`cat.${c}`) }))}
                className="w-full [&>button]:w-full [&>button]:justify-between [&>button]:rounded-xl [&>button]:text-[14px]"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={LABEL}>{t("sv.price")}</span>
              <div className="relative mt-2">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[14px] text-white/35">$</span>
                <input
                  value={price}
                  onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ""))}
                  inputMode="numeric"
                  placeholder="25"
                  className={`${INPUT} pl-8`}
                />
              </div>
            </label>
            <label className="block">
              <span className={LABEL}>{t("sv.deliveryTime")}</span>
              <div className="relative mt-2">
                <input
                  value={deliveryDays}
                  onChange={(e) => setDeliveryDays(e.target.value.replace(/[^0-9]/g, ""))}
                  inputMode="numeric"
                  placeholder="3"
                  className={`${INPUT} pr-14`}
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[13px] text-white/35">{t("sv.days")}</span>
              </div>
            </label>
          </div>
        </div>

        <div className="mt-6 flex gap-2.5 border-t border-white/8 pt-5">
          <button
            onClick={onClose}
            className="rounded-xl border border-white/12 bg-white/[0.03] px-5 py-3 text-[13.5px] font-semibold text-white/70 transition-colors hover:border-white/25 hover:text-white"
          >
            {t("common.cancel")}
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="flex-1 rounded-xl bg-brand py-3 text-[13.5px] font-bold text-fg-1 glow-brand disabled:opacity-50"
          >
            {saving ? t("sv.adding") : t("sv.addService")}
          </button>
        </div>
      </div>
    </div>
  );
}

// Өөрийн үйлчилгээг удирдах — Settings → "My Services" таб байсныг энд
// авчирсан: жагсаалтаа хараад тэндээсээ удирдах нь тохиргоо руу орохоос зөв.
function MyGigs({ onCreate }) {
  const t = useT();
  const { nav } = useNav();
  const [gigs, setGigs] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  const load = () => fetchMyGigs().then((r) => setGigs(r.gigs)).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const toggleActive = async (g) => {
    setBusyId(g.id);
    setError("");
    try {
      const updated = await updateGig(g.id, { active: !g.active });
      setGigs((arr) => arr.map((x) => (x.id === g.id ? updated : x)));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id) => {
    setBusyId(id);
    setError("");
    try {
      await deleteGig(id);
      setGigs((arr) => arr.filter((x) => x.id !== id));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  if (gigs === null) return <p className="mt-6 text-[13px] text-white/40">{t("common.loading")}</p>;

  return (
    <div className="mt-6 space-y-3">
      {error && (
        <p className="flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-[12.5px] text-red-400">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
        </p>
      )}
      {gigs.length === 0 && (
        <div className="glass rounded-2xl p-10 text-center">
          <p className="text-[14px] font-semibold">{t("sv.noneOfMine")}</p>
          <p className="mt-1.5 text-[12.5px] text-white/45">{t("sv.noneOfMineHint")}</p>
          <button onClick={onCreate} className="mt-5 rounded-xl bg-brand px-5 py-2.5 text-[12.5px] font-bold text-fg-1 glow-brand">
            {t("sv.addService")}
          </button>
        </div>
      )}
      {gigs.map((g) => (
        <div key={g.id} className="glass flex flex-wrap items-center gap-4 rounded-2xl p-4">
          {g.images?.[0] ? (
            <img src={avatarSrc(g.images[0])} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
          ) : (
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/[0.03] text-white/20">
              <ImageIcon className="h-5 w-5" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <button onClick={() => nav("gig", { id: g.id })} className="block truncate text-left text-[13.5px] font-semibold hover:text-brand-soft">
              {g.title}
            </button>
            <p className="mt-0.5 text-[11.5px] text-white/40">
              {g.category} · ${g.price} · {g.deliveryDays}d
              {g.ordersCount > 0 && ` · ${t("sv.orders", { n: g.ordersCount })}`}
            </p>
          </div>
          <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
            g.active ? "border-mint/30 bg-mint/10 text-mint" : "border-white/15 bg-white/[0.05] text-white/45"
          }`}>
            {g.active ? t("sv.active") : t("sv.paused")}
          </span>
          <div className="flex shrink-0 gap-2">
            <button
              onClick={() => toggleActive(g)}
              disabled={busyId === g.id}
              className="rounded-lg border border-white/12 px-3 py-1.5 text-[11.5px] font-semibold text-white/70 transition-colors hover:border-white/25 hover:text-white disabled:opacity-50"
            >
              {g.active ? t("sv.pause") : t("sv.activate")}
            </button>
            <button
              onClick={() => remove(g.id)}
              disabled={busyId === g.id}
              className="rounded-lg border border-red-400/30 px-3 py-1.5 text-[11.5px] font-semibold text-red-300 transition-colors hover:bg-red-400/10 disabled:opacity-50"
            >
              {t("common.delete")}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function FindServices() {
  const t = useT();
  const { params, nav } = useNav();
  const [q, setQ] = useState(params?.query || "");
  const [cat, setCat] = useState(params?.category || "All");
  const [sort, setSort] = useState("relevant");
  const [page, setPage] = useState(1);

  const [gigs, setGigs] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [view, setView] = useState("all"); // all | mine

  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetchGigs({
          q: q.trim() || undefined,
          category: cat !== "All" ? cat : undefined,
          sort,
          page,
          pageSize: 12,
        });
        setGigs(res.gigs);
        setTotal(res.total);
        setTotalPages(res.totalPages);
      } catch (err) {
        setError(err.message);
        setGigs([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q, cat, sort, page]);

  return (
    <div className="mx-auto max-w-[1400px] px-6 pb-24 pt-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-soft">
            {t("sv.eyebrow")}
          </p>
          <h1 className="mt-3 font-display text-[clamp(1.9rem,3.6vw,2.8rem)] font-bold text-brand text-glow tracking-tight">
            {t("sv.title")}
          </h1>
          <p className="mt-2 max-w-xl text-[13.5px] text-white/50">
            {t("sv.subtitle")}
          </p>
        </div>
        {/* Өмнө нь үйлчилгээ нэмэхийн тулд Settings → My Services руу
            орох цорын ганц зам байсан — зар харж байгаа хуудсандаа
            байхад нь шууд нэмэх нь илүү зөв. */}
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-brand px-5 py-3 text-[13.5px] font-semibold text-fg-1 glow-brand transition-transform hover:scale-[1.02]"
        >
          <Plus className="h-4 w-4" />
          {t("sv.addService")}
        </button>
      </div>

      <div className="mt-6 flex gap-2">
        {[
          { id: "all", label: t("sv.tabAll") },
          { id: "mine", label: t("sv.tabMine") },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setView(id)}
            className={
              view === id
                ? "rounded-xl bg-brand px-4 py-2.5 text-[12.5px] font-semibold text-fg-1 glow-brand"
                : "glass rounded-xl px-4 py-2.5 text-[12.5px] font-medium text-white/55 transition-colors hover:text-white"
            }
          >
            {label}
          </button>
        ))}
      </div>

      {view === "mine" && <MyGigs onCreate={() => setShowCreate(true)} />}

      {view === "all" && (
      <>
      <div className="mt-7 flex flex-wrap items-center gap-3">
        <div className="flex min-w-[240px] flex-1 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 focus-within:border-brand/50">
          <Search className="h-4.5 w-4.5 shrink-0 text-white/40" />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            placeholder={t("sv.searchPlaceholder")}
            className="w-full bg-transparent text-[14px] outline-none placeholder:text-white/30"
          />
        </div>
        <Select
          icon={SlidersHorizontal}
          value={sort}
          onChange={(v) => { setSort(v); setPage(1); }}
          options={Object.entries(SORTS).map(([k, v]) => ({ value: k, label: t(v) }))}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {CATS.map((c) => (
          <button
            key={c}
            onClick={() => { setCat(c); setPage(1); }}
            className={
              cat === c
                ? "rounded-full bg-brand px-4 py-2 text-[12px] font-semibold glow-brand"
                : "rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-[12px] font-medium text-white/55 transition-colors hover:border-brand/40 hover:text-white"
            }
          >
            {t(`cat.${c}`)}
          </button>
        ))}
      </div>

      <p className="mt-6 text-[12.5px] text-white/40">
        {loading ? t("sv.loading") : <>{total} {t("sv.found")}</>}
      </p>

      {error && (
        <p className="mt-4 flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-[12.5px] font-medium text-red-400">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
        </p>
      )}

      {loading && <CardGridSkeleton count={8} className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4" />}
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {!loading && gigs.map((g, i) => <GigCard key={g.id} g={g} nav={nav} i={i} />)}
      </div>

      {!loading && gigs.length === 0 && !error && (
        <div className="glass mt-4 rounded-2xl p-12 text-center">
          <p className="text-[14px] font-semibold">{t("sv.noneMatch")}</p>
          <p className="mt-1.5 text-[12.5px] text-white/45">{t("sv.noneMatchHint")}</p>
          <button
            onClick={() => { setQ(""); setCat("All"); setPage(1); }}
            className="mt-5 rounded-xl bg-brand px-5 py-2.5 text-[12.5px] font-bold text-fg-1 glow-brand"
          >
            {t("sv.clearFilters")}
          </button>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-white/60 transition-colors hover:border-white/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-[12.5px] text-white/50">{t("fw.pageOf", { page, total: totalPages })}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-white/60 transition-colors hover:border-white/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
      </>
      )}

      {showCreate && (
        <CreateGigModal
          onClose={() => setShowCreate(false)}
          onCreated={(gig) => {
            setShowCreate(false);
            // Шинээр нэмсэн үйлчилгээ нь шүүлтүүрт таарахгүй байж болно
            // (өөр категори г.м) тул жагсаалтын өмнө шууд оруулахын оронд
            // дэлгэрэнгүй хуудас руу нь үсэргэнэ — хэрэглэгч бодитоор
            // нийтлэгдсэнийг өөрөө хардаг.
            nav("gig", { id: gig.id });
          }}
        />
      )}
    </div>
  );
}
