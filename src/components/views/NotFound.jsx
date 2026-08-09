import { Home, Search, ArrowLeft } from "lucide-react";
import BlurText from "../fx/BlurText.jsx";
import { useNav } from "../../nav.jsx";

export default function NotFound() {
  const { nav } = useNav();
  return (
    <div className="relative flex min-h-screen items-center justify-center px-6 py-28 text-center">
      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/3 h-[420px] w-[620px] -translate-x-1/2 rounded-full bg-brand/12 blur-[140px]" />
      <div className="relative">
        <p className="font-display text-[clamp(5rem,16vw,10rem)] font-bold leading-none text-brand text-glow">404</p>
        <h1 className="mt-2 font-display text-2xl font-bold tracking-tight">
          <BlurText text="This page went freelance." />
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-[14px] leading-relaxed text-white/50">
          The page you're after doesn't exist or has moved. Let's get you back to work.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button onClick={() => nav("home")} className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3 text-[13.5px] font-semibold text-fg-1 glow-brand transition-shadow">
            <Home className="h-4 w-4" /> Back home
          </button>
          <button onClick={() => nav("find-work")} className="glass inline-flex items-center gap-2 rounded-xl px-6 py-3 text-[13.5px] font-semibold text-white/85 transition-colors hover:border-white/25">
            <Search className="h-4 w-4" /> Find work
          </button>
        </div>
      </div>
    </div>
  );
}
