import { ArrowRight } from "lucide-react";
import { useNav } from "../../nav.jsx";

// Видео дэвсгэртэй hero — KREATIV-ийн брэнд (--color-brand / --font-display)
// дээр тохируулсан.
//
// Өөрийн navbar/mobile цэсийг ЗОРИУД агуулаагүй: сайтын Navbar нь
// `fixed … z-50` тул энэ хэсгийн дээгүүр аль хэдийн хөвж байдаг бөгөөд
// нэвтэрсэн эсэхийг мэддэг (хэрэглэгчийн нэр, "Log in" солигддог). Энд
// хуулбар nav байвал доогуур нь (z-20) дарагдаад харагдахгүй, мөн хоёр
// тусдаа навигацийг зэрэг арчлах шаардлага үүснэ.
const VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260210_031346_d87182fb-b0af-4273-84d1-c6fd17d6bf0f.mp4";

export default function DatacoreHero() {
  const { nav } = useNav();

  return (
    <section className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden">
      {/* Видео дэвсгэр. `poster` байхгүй тул ачаалагдах хүртэл доорх бараан
          дэвсгэр харагдана — цагаан анивчилт гарахгүй. */}
      <video
        autoPlay
        loop
        muted
        playsInline
        aria-hidden="true"
        className="absolute inset-0 h-full w-full bg-ink object-cover"
      >
        <source src={VIDEO_URL} type="video/mp4" />
      </video>

      {/* Текст уншигдахуйц байлгах давхарга. Видео нь гэрэлтэй кадртай
          байж болох тул тогтмол харанхуйлалт зайлшгүй. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-b from-ink/80 via-ink/55 to-ink"
      />

      {/* Агуулга. pt-28 нь дээрх fixed Navbar-ын доогуур орохоос сэргийлнэ. */}
      <div className="relative z-10 flex flex-col items-center px-6 pb-20 pt-28 text-center">
        <div className="glass inline-flex h-[38px] items-center gap-2 rounded-[10px] px-3">
          <span className="rounded-[6px] bg-brand px-2 py-0.5 text-[12px] font-bold text-fg-1">New</span>
          <span className="text-[14px] font-medium text-white">AI matching now live on KREATIV</span>
        </div>

        {/* Instrument Serif: static English marketing copy only (never
            Cyrillic user content), per the site-wide font token comment. */}
        <h1 className="mt-6 max-w-4xl font-serif text-[clamp(2.6rem,7.5vw,6rem)] font-normal leading-[1.05] text-white">
          Elite work meets{" "}
          <span className="bg-gradient-to-r from-brand-soft via-neon to-violet-soft bg-clip-text italic text-transparent">
            elite talent
          </span>
        </h1>

        <p className="mt-6 max-w-[620px] text-[clamp(0.95rem,2vw,1.125rem)] leading-relaxed text-white/70">
          Post a brief, get AI-matched in hours, and track every milestone in real time — with
          escrow-protected payments.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={() => nav("find-talent")}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-7 py-3.5 text-[15px] font-semibold text-fg-1 glow-brand transition-transform hover:scale-[1.03]"
          >
            Find Talent
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => nav("post-job")}
            className="glass rounded-xl px-7 py-3.5 text-[15px] font-semibold text-white/90 transition-all hover:border-white/25"
          >
            Post a Job
          </button>
        </div>
      </div>
    </section>
  );
}
