import { ArrowRight } from "lucide-react";
import { useNav } from "../../nav.jsx";
import { useI18n } from "../../i18n.jsx";

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
  const { locale, t } = useI18n();

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
        <div
          className="glass animate-rise-in inline-flex h-[38px] items-center gap-2 rounded-[10px] px-3"
          style={{ animationDelay: "0.05s" }}
        >
          <span className="rounded-[6px] bg-brand px-2 py-0.5 text-[12px] font-bold text-fg-1">{t("home.newBadge")}</span>
          <span className="text-[14px] font-medium text-white">{t("home.aiLive")}</span>
        </div>

        {/* Instrument Serif нь ЗӨВХӨН латин үсэгтэй (site-wide font token
            дээрх тэмдэглэлийг үз) тул монгол гарчгийг түүгээр бичвэл кирилл
            нь системийн ямар нэг serif рүү унаж, нэг гарчиг дотор хоёр өөр
            фонт холилдоно. Тиймээс монгол үед кирилл дэмждэг display фонт
            руу шилжинэ — жин/хэмжээгээр нь ижил хүчтэй харагдана. */}
        <h1
          className={`animate-rise-in mt-6 max-w-4xl text-balance text-[clamp(2.6rem,7.5vw,6rem)] leading-[1.05] text-white ${
            locale === "en" ? "font-serif font-normal" : "font-display font-bold tracking-tight"
          }`}
          style={{ animationDelay: "0.15s" }}
        >
          {t("home.heroTitleA")}{" "}
          <span
            // pr-[0.08em]: bg-clip-text нь үсгийн хайрцгаар тасалдаг тул
            // налуу "t"-ийн сүүлчийн туйв ирмэг дээр огтлогдож байв.
            className={`bg-gradient-to-r from-brand-soft via-neon to-violet-soft bg-clip-text text-transparent ${
              locale === "en" ? "italic pr-[0.08em]" : ""
            }`}
          >
            {t("home.heroTitleB")}
          </span>
        </h1>

        <p
          className="animate-rise-in mt-6 max-w-[620px] text-[clamp(0.95rem,2vw,1.125rem)] leading-relaxed text-white/70"
          style={{ animationDelay: "0.28s" }}
        >
          {t("home.heroSub")}
        </p>

        <div
          className="animate-rise-in mt-8 flex flex-wrap items-center justify-center gap-4"
          style={{ animationDelay: "0.4s" }}
        >
          <button
            onClick={() => nav("find-talent")}
            className="group inline-flex items-center gap-2 rounded-xl bg-brand px-7 py-3.5 text-[15px] font-semibold text-fg-1 glow-brand transition-transform duration-300 hover:scale-[1.03]"
          >
            {t("nav.findTalent")}
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </button>
          <button
            onClick={() => nav("post-job")}
            className="glass rounded-xl px-7 py-3.5 text-[15px] font-semibold text-white/90 transition-all duration-300 hover:border-white/25 hover:-translate-y-0.5"
          >
            {t("nav.postJob")}
          </button>
        </div>
      </div>
    </section>
  );
}
