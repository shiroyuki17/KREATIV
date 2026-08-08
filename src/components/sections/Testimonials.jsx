import { useEffect, useState } from "react";
import { Star, ArrowRight } from "lucide-react";
import SpotlightCard from "../fx/SpotlightCard.jsx";
import BlurText from "../fx/BlurText.jsx";
import { useNav } from "../../nav.jsx";
import { fetchPublicReviews } from "../../lib/contractApi.js";

// Өмнө нь appMock.js-ийн зохиомол сэтгэгдлүүдийг харуулдаг байв. Reviews
// хуудсыг бодит болгосны дараа нүүр хуудас нь хуурамч сэтгэгдэл харуулсаар
// байсан тул хоёр хуудас хоорондоо зөрчилдөж байлаа. Одоо хоёулаа
// /reviews/public-ийн ижил эх сурвалжаас уншина.
function initialsOf(name) {
  return (name || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

export default function Testimonials() {
  const { nav } = useNav();
  const [reviews, setReviews] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchPublicReviews()
      .then((res) => { if (!cancelled) setReviews(res.reviews || []); })
      .catch(() => { if (!cancelled) setReviews([]); });
    return () => { cancelled = true; };
  }, []);

  // Бодит сэтгэгдэл байхгүй бол хэсгийг бүхэлд нь нуух — "Clients and
  // freelancers agree" гэсэн гарчиг доор хоосон газар үлдээхээс дээр.
  if (reviews && reviews.length === 0) return null;

  return (
    <section id="stories" className="relative py-12 md:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-soft">— Loved by both sides</p>
            <h2 className="mt-3 font-display text-[clamp(1.9rem,3.6vw,2.8rem)] font-bold text-brand text-glow tracking-tight">
              <BlurText text="Clients and freelancers agree" />
            </h2>
          </div>
          <button
            onClick={() => nav("reviews")}
            className="inline-flex items-center gap-2 rounded-xl border border-white/12 px-5 py-2.5 text-[13px] font-semibold text-white/80 transition-colors hover:border-brand/40 hover:text-white"
          >
            Read success stories <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {(reviews || []).slice(0, 3).map((t) => (
            <SpotlightCard key={t.id}>
              <div className="flex h-full flex-col p-6">
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-4 w-4 ${i < Math.round(t.stars) ? "fill-amber-400 text-amber-400" : "text-white/15"}`} />
                  ))}
                </div>
                <p className="mt-4 flex-1 text-[14px] leading-relaxed text-white/75">“{t.comment}”</p>
                <div className="mt-5 flex items-center gap-3 border-t border-white/8 pt-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand/50 to-neon/40 font-display text-[12px] font-bold ring-1 ring-white/15">
                    {initialsOf(t.reviewerName)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-semibold">{t.reviewerName}</p>
                    <p className="truncate text-[11.5px] text-white/40">
                      {t.authorSide === "client" ? "Client" : "Freelancer"}
                      {t.jobTitle ? ` · ${t.jobTitle}` : ""}
                    </p>
                  </div>
                </div>
              </div>
            </SpotlightCard>
          ))}
        </div>
      </div>
    </section>
  );
}
