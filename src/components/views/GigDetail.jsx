import { useEffect, useState } from "react";
import { ArrowLeft, Star, BadgeCheck, Clock, ImageIcon, AlertCircle, Loader2, MessageSquare } from "lucide-react";
import { useNav } from "../../nav.jsx";
import { avatarSrc } from "../../lib/authApi.js";
import { fetchGig, orderGig } from "../../lib/gigApi.js";

function initialsOf(name) {
  return (name || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

export default function GigDetail() {
  const { params, nav, user, mode } = useNav();
  const [gig, setGig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ordering, setOrdering] = useState(false);
  const [orderError, setOrderError] = useState("");

  useEffect(() => {
    if (!params?.id) return;
    setLoading(true);
    setError("");
    fetchGig(params.id)
      .then(setGig)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [params?.id]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-soft" />
      </div>
    );
  }
  if (error || !gig) {
    return (
      <div className="mx-auto max-w-xl px-6 pb-24 pt-20 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-red-400" />
        <p className="mt-4 text-[14px] text-white/60">{error || "Үйлчилгээ олдсонгүй."}</p>
        <button onClick={() => nav("find-services")} className="mt-5 text-[13px] font-semibold text-brand-soft hover:text-white">
          ← Back to services
        </button>
      </div>
    );
  }

  const isOwn = user?.id === gig.freelancer.userId;

  const handleOrder = async () => {
    setOrdering(true);
    setOrderError("");
    try {
      const contract = await orderGig(gig.id);
      nav("my-projects", { highlightContractId: contract.id });
    } catch (err) {
      setOrderError(err.message);
    } finally {
      setOrdering(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-6 pb-24 pt-8">
      <button
        onClick={() => nav("find-services")}
        className="inline-flex items-center gap-2 text-[13px] font-medium text-white/50 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to services
      </button>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div>
          {gig.images?.[0] ? (
            <img src={avatarSrc(gig.images[0])} alt="" className="h-72 w-full rounded-2xl object-cover" />
          ) : (
            <div className="flex h-72 w-full items-center justify-center rounded-2xl bg-white/[0.02] text-white/15">
              <ImageIcon className="h-12 w-12" />
            </div>
          )}
          {gig.images?.length > 1 && (
            <div className="mt-3 grid grid-cols-4 gap-2">
              {gig.images.slice(1).map((img, i) => (
                <img key={i} src={avatarSrc(img)} alt="" className="h-20 w-full rounded-xl object-cover" />
              ))}
            </div>
          )}

          <h1 className="mt-6 font-display text-2xl font-bold tracking-tight">{gig.title}</h1>

          <button
            onClick={() => nav("profile", { userId: gig.freelancer.userId })}
            className="mt-4 flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] p-3 text-left transition-colors hover:border-white/20"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand font-display text-sm font-bold">
              {gig.freelancer.avatarUrl ? (
                <img src={avatarSrc(gig.freelancer.avatarUrl)} alt="" className="h-full w-full object-cover" />
              ) : (
                initialsOf(gig.freelancer.name)
              )}
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-1.5 text-[13.5px] font-semibold">
                {gig.freelancer.name}
                {gig.freelancer.verified && <BadgeCheck className="h-4 w-4 text-neon" />}
              </span>
              <span className="flex items-center gap-3 text-[11.5px] text-white/45">
                {gig.freelancer.ratingAvg > 0 && (
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {gig.freelancer.ratingAvg.toFixed(1)}
                  </span>
                )}
                <span>{gig.freelancer.jobsCompleted} jobs completed</span>
              </span>
            </span>
          </button>

          <p className="mt-6 whitespace-pre-wrap text-[14px] leading-relaxed text-white/70">{gig.description}</p>
        </div>

        <div className="lg:sticky lg:top-28 lg:self-start">
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <p className="font-display text-3xl font-bold text-mint">${gig.price}</p>
              <span className="flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.03] px-3 py-1.5 text-[12px] font-semibold text-white/70">
                <Clock className="h-3.5 w-3.5" /> {gig.deliveryDays} day{gig.deliveryDays !== 1 ? "s" : ""}
              </span>
            </div>

            {(gig.reviewCount > 0 || gig.ordersCount > 0) && (
              <div className="mt-3 flex items-center gap-3 text-[12px] text-white/45">
                {gig.reviewCount > 0 && (
                  <span className="flex items-center gap-1 font-semibold text-amber-400">
                    <Star className="h-3.5 w-3.5 fill-amber-400" /> {gig.ratingAvg.toFixed(1)} ({gig.reviewCount})
                  </span>
                )}
                {gig.ordersCount > 0 && <span>{gig.ordersCount} захиалагдсан</span>}
              </div>
            )}

            {orderError && (
              <p className="mt-4 flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-[12px] font-medium text-red-400">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {orderError}
              </p>
            )}

            {isOwn ? (
              <p className="mt-5 rounded-xl border border-white/12 bg-white/[0.03] px-3.5 py-2.5 text-center text-[12.5px] text-white/50">
                Энэ бол таны өөрийн үйлчилгээ
              </p>
            ) : (
              <button
                onClick={handleOrder}
                disabled={ordering || mode === "freelancer"}
                className="mt-5 w-full rounded-xl bg-brand py-3.5 text-[14px] font-semibold text-fg-1 glow-brand transition-shadow disabled:cursor-not-allowed disabled:opacity-50"
              >
                {ordering ? "Захиалж байна…" : "Захиалах"}
              </button>
            )}
            {mode === "freelancer" && !isOwn && (
              <p className="mt-2 text-center text-[11.5px] text-white/40">
                Захиалахын тулд client горим руу шилжинэ үү
              </p>
            )}

            <button
              onClick={() => nav("messages", { withUserId: gig.freelancer.userId })}
              className="glass mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[13.5px] font-semibold text-white/85 transition-colors hover:border-white/25"
            >
              <MessageSquare className="h-4 w-4" />
              Асуулт асуух
            </button>

            <p className="mt-4 text-center text-[11px] text-white/35">
              Захиалахад мөнгө шууд шимтэгддэггүй — эхлээд гэрээ үүсэж, escrow-д мөнгө байршуулснаар л ажил эхэлнэ.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
