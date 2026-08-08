import { useEffect, useState } from "react";
import { Menu, X, ShieldCheck, Search, Users } from "lucide-react";
import { useNav } from "../../nav.jsx";
import { useEscapeKey } from "../../hooks/useEscapeKey.js";

export default function Navbar() {
  const { page, nav } = useNav();
  const [mobile, setMobile] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Хуудасны оройд navbar бараг үл үзэгдэх байхад гоё харагддаг ч, доошоо
  // гүйлгэхэд `glass` хэт тунгалаг тул ард нь өнгөрөх гарчиг/картууд бүрэн
  // уншигдаж, давхцал нүдэнд ил алдаа шиг харагддаг байсан. Тиймээс оройд
  // тунгалаг, гүйлгэсний дараа битүү дэвсгэр рүү шилжинэ.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // lock body scroll while the mobile sheet is open
  useEffect(() => {
    document.body.style.overflow = mobile ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobile]);

  useEscapeKey(() => setMobile(false), mobile);

  const go = (p, params) => { setMobile(false); nav(p, params); };

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4">
      <div
        className={`mx-auto mt-4 flex max-w-6xl items-center justify-between rounded-2xl px-5 py-3 transition-[background-color,border-color,box-shadow] duration-300 md:px-6 ${
          scrolled || mobile
            ? "border border-line bg-ink/92 shadow-[0_10px_40px_rgba(0,0,0,0.45)]"
            : "glass"
        }`}
      >
        <button onClick={() => go("home")} className="font-display text-lg tracking-tight">
          <span className="font-bold">KRE</span>
          <span className="bg-gradient-to-r from-brand-soft to-neon bg-clip-text font-bold text-transparent">
            ATIV
          </span>
        </button>

        {/* Desktop nav — kept deliberately minimal: 3 links, generous whitespace */}
        <nav className="hidden items-center gap-8 md:flex">
          <button
            onClick={() => nav("find-work")}
            className={`text-[13px] font-medium transition-colors hover:text-white ${
              page === "find-work" ? "text-brand-soft" : "text-white/55"
            }`}
          >
            Find Work
          </button>
          <button
            onClick={() => nav("find-talent")}
            className={`text-[13px] font-medium transition-colors hover:text-white ${
              page === "find-talent" ? "text-brand-soft" : "text-white/55"
            }`}
          >
            Find Talent
          </button>
          <button
            onClick={() => nav("trust")}
            className={`text-[13px] font-medium transition-colors hover:text-mint ${
              page === "trust" ? "text-mint" : "text-white/55"
            }`}
          >
            Trust & Safety
          </button>
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={() => nav("auth", { mode: "login" })}
            className="hidden text-[13px] font-medium text-white/70 transition-colors hover:text-white sm:block"
          >
            Log in
          </button>
          <button
            onClick={() => nav("post-job")}
            className="hidden rounded-xl bg-brand px-4 py-2 text-[13px] font-semibold text-ink transition-shadow glow-brand sm:block"
          >
            Post a Job
          </button>

          {/* Hamburger — mobile only */}
          <button
            onClick={() => setMobile((m) => !m)}
            aria-label={mobile ? "Close menu" : "Open menu"}
            aria-expanded={mobile}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-white/[0.04] text-white/80 transition-colors hover:text-white md:hidden"
          >
            {mobile ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile sheet */}
      {mobile && (
        <>
          <div
            className="fixed inset-0 -z-10 bg-black/50 md:hidden"
            onClick={() => setMobile(false)}
          />
          <div className="mx-auto mt-2 max-w-6xl animate-feed-in rounded-2xl border border-line bg-[#0a0f0d]/98 p-3 shadow-[0_24px_60px_rgba(0,0,0,0.7)] md:hidden">
            <button
              onClick={() => go("find-work")}
              className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-[14px] font-medium text-white/80 transition-colors hover:bg-white/5 hover:text-white"
            >
              <Search className="h-4.5 w-4.5 text-brand-soft" /> Find Work
            </button>
            <button
              onClick={() => go("find-talent")}
              className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-[14px] font-medium text-white/80 transition-colors hover:bg-white/5 hover:text-white"
            >
              <Users className="h-4.5 w-4.5 text-brand-soft" /> Find Talent
            </button>
            <button
              onClick={() => go("trust")}
              className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-[14px] font-medium text-white/80 transition-colors hover:bg-white/5 hover:text-white"
            >
              <ShieldCheck className="h-4.5 w-4.5 text-mint" /> Trust & Safety
            </button>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                onClick={() => go("auth", { mode: "login" })}
                className="rounded-xl border border-white/12 py-3 text-[13.5px] font-semibold text-white/80 transition-colors hover:border-white/25"
              >
                Log in
              </button>
              <button
                onClick={() => go("post-job")}
                className="rounded-xl bg-brand py-3 text-[13.5px] font-semibold text-ink glow-brand"
              >
                Post a Job
              </button>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
