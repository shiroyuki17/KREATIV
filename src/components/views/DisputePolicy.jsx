import { AlertTriangle, Lock, FileSearch, Scale, Check } from "lucide-react";
import { useNav } from "../../nav.jsx";
import { useT } from "../../i18n.jsx";

const STEPS = [
  { Icon: Lock, titleKey: "dp.s1", descKey: "dp.s1d" },
  { Icon: FileSearch, titleKey: "dp.s2", descKey: "dp.s2d" },
  { Icon: Scale, titleKey: "dp.s3", descKey: "dp.s3d" },
  { Icon: Check, titleKey: "dp.s4", descKey: "dp.s4d" },
];

export default function DisputePolicy() {
  const { nav } = useNav();
  const t = useT();
  return (
    <div className="mx-auto max-w-3xl px-6 pb-24 pt-36">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-soft">{t("tos.eyebrow")}</p>
      <h1 className="mt-3 font-display text-[clamp(1.8rem,3.5vw,2.6rem)] font-bold tracking-tight">{t("dp.title")}</h1>
      <p className="mt-2 text-[12.5px] text-white/40">{t("tos.version")}</p>

      <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-400/25 bg-amber-400/[0.06] p-5">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
        <p className="text-[12.5px] leading-relaxed text-amber-200/90">{t("dp.warning")}</p>
      </div>

      <div className="mt-10 space-y-6">
        {STEPS.map(({ Icon, titleKey, descKey }) => (
          <div key={titleKey} className="glass rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand/30 bg-brand/10 text-brand-soft">
                <Icon className="h-4.5 w-4.5" />
              </span>
              <div>
                <p className="font-display text-[15px] font-bold">{t(titleKey)}</p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-white/55">{t(descKey)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10">
        <h2 className="font-display text-[17px] font-bold tracking-tight">{t("dp.repeatTitle")}</h2>
        <p className="mt-3 text-[13.5px] leading-relaxed text-white/60">{t("dp.repeatDesc")}</p>
      </div>

      <div className="mt-12 flex flex-wrap gap-3 border-t border-white/8 pt-6">
        <button onClick={() => nav("terms")} className="text-[13px] font-semibold text-brand-soft hover:text-white">
          {t("dp.toTerms")}
        </button>
        <button onClick={() => nav("help")} className="text-[13px] font-semibold text-white/50 hover:text-white">
          {t("tos.toHelp")}
        </button>
      </div>
    </div>
  );
}
