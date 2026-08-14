import { AlertTriangle } from "lucide-react";
import { useNav } from "../../nav.jsx";
import { useT } from "../../i18n.jsx";

const SECTIONS = [
  { titleKey: "tos.s1", bodyKeys: ["tos.s1a", "tos.s1b"] },
  { titleKey: "tos.s2", bodyKeys: ["tos.s2a", "tos.s2b", "tos.s2c"] },
  { titleKey: "tos.s3", bodyKeys: ["tos.s3a", "tos.s3b", "tos.s3c"] },
  { titleKey: "tos.s4", bodyKeys: ["tos.s4a", "tos.s4b"] },
  { titleKey: "tos.s5", bodyKeys: ["tos.s5a"] },
  { titleKey: "tos.s6", bodyKeys: ["tos.s6a"] },
];

export default function Terms() {
  const { nav } = useNav();
  const t = useT();
  return (
    <div className="mx-auto max-w-3xl px-6 pb-24 pt-36">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-soft">{t("tos.eyebrow")}</p>
      <h1 className="mt-3 font-display text-[clamp(1.8rem,3.5vw,2.6rem)] font-bold tracking-tight">{t("tos.title")}</h1>
      <p className="mt-2 text-[12.5px] text-white/40">{t("tos.version")}</p>

      <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-400/25 bg-amber-400/[0.06] p-5">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
        <p className="text-[12.5px] leading-relaxed text-amber-200/90">{t("tos.warning")}</p>
      </div>

      <div className="mt-10 space-y-8">
        {SECTIONS.map((s) => (
          <div key={s.titleKey}>
            <h2 className="font-display text-[17px] font-bold tracking-tight">{t(s.titleKey)}</h2>
            <div className="mt-3 space-y-3">
              {s.bodyKeys.map((k) => (
                <p key={k} className="text-[13.5px] leading-relaxed text-white/60">{t(k)}</p>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 flex flex-wrap gap-3 border-t border-white/8 pt-6">
        <button onClick={() => nav("dispute-policy")} className="text-[13px] font-semibold text-brand-soft hover:text-white">
          {t("tos.toDispute")}
        </button>
        <button onClick={() => nav("help")} className="text-[13px] font-semibold text-white/50 hover:text-white">
          {t("tos.toHelp")}
        </button>
      </div>
    </div>
  );
}
