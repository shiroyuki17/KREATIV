import { Check } from "lucide-react";
import { MILESTONES } from "../../data/mock.js";

/**
 * Milestone timeline. Completed steps fill green, the active step gets a soft
 * pulsing ring, upcoming steps stay quiet. Hovering a step lifts it gently —
 * no scrambling, no blurring, everything stays readable.
 */
export default function MilestoneStepper({ stage }) {
  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-start">
        {MILESTONES.map((m, i) => {
          const done = i < stage;
          const active = i === stage;

          return (
            <div key={m.label} className="flex flex-1 items-start last:flex-none">
              <div className="group flex w-[120px] cursor-default flex-col items-center text-center">
                <span
                  className={`relative flex h-9 w-9 items-center justify-center rounded-full transition-all duration-300 group-hover:scale-110 ${
                    done
                      ? "bg-brand text-ink shadow-[0_0_16px_rgba(0,211,149,0.55)]"
                      : active
                        ? "border-2 border-brand bg-brand/10 text-brand"
                        : "border border-white/12 bg-white/[0.03] text-white/30"
                  }`}
                >
                  {/* soft halo on the active step */}
                  {active && (
                    <span className="absolute inset-0 animate-ping rounded-full bg-brand/25 [animation-duration:2.4s]" />
                  )}
                  {done ? (
                    <Check className="h-4 w-4" />
                  ) : active ? (
                    <span className="relative h-2 w-2 rounded-full bg-brand" />
                  ) : (
                    <span className="text-[11px] font-semibold">{i + 1}</span>
                  )}
                </span>

                <p
                  className={`mt-3 text-[12px] font-semibold leading-tight transition-colors duration-300 ${
                    active
                      ? "text-brand"
                      : done
                        ? "text-white/85"
                        : "text-white/40 group-hover:text-white/70"
                  }`}
                >
                  {m.label}
                </p>
                <p className="mt-1 text-[10.5px] text-white/35">
                  {m.amount} · {m.date}
                </p>
              </div>

              {i < MILESTONES.length - 1 && (
                <div className="mt-[18px] h-0.5 flex-1 overflow-hidden rounded-full bg-white/8">
                  <div
                    className="h-full rounded-full bg-brand transition-[width] duration-700 ease-out"
                    style={{ width: i < stage ? "100%" : "0%" }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
