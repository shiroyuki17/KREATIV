import { Sparkles, MessageSquare, CircleDollarSign, Briefcase, Bell, X } from "lucide-react";
import { useLive } from "../live.jsx";
import { useNav } from "../nav.jsx";

const META = {
  brief: { Icon: Sparkles, cls: "border-brand/30 bg-brand/10 text-brand-soft", page: "find-work" },
  message: { Icon: MessageSquare, cls: "border-neon/30 bg-neon/10 text-neon", page: "messages" },
  payment: { Icon: CircleDollarSign, cls: "border-mint/30 bg-mint/10 text-mint", page: "payments" },
  job: { Icon: Briefcase, cls: "border-brand/30 bg-brand/10 text-brand-soft", page: "my-projects" },
};
const FALLBACK_META = { Icon: Bell, cls: "border-white/15 bg-white/[0.05] text-white/70", page: "notifications" };

/** Slide-in toasts driven by the simulated realtime stream. */
export default function LiveToasts() {
  const { toasts, dismiss } = useLive();
  const { nav } = useNav();

  if (!toasts.length) return null;

  return (
    <div className="pointer-events-none fixed bottom-24 right-6 z-[60] flex w-[min(330px,calc(100vw-3rem))] flex-col gap-2.5">
      {toasts.map((t) => {
        const { Icon, cls, page } = META[t.kind] || FALLBACK_META;
        return (
          <div
            key={t.id}
            className="pointer-events-auto flex animate-toast-in items-start gap-3 rounded-2xl border border-white/10 bg-[#0a100d]/95 p-3.5 shadow-[0_16px_44px_rgba(0,0,0,0.6)] backdrop-blur-xl"
          >
            <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${cls}`}>
              <Icon className="h-4 w-4" />
            </span>
            <button onClick={() => { nav(page); dismiss(t.id); }} className="min-w-0 flex-1 text-left">
              <p className="text-[13px] font-semibold">{t.title}</p>
              <p className="mt-0.5 text-[11.5px] leading-snug text-white/50">{t.body}</p>
            </button>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
              className="rounded-lg p-1 text-white/30 transition-colors hover:bg-white/5 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
