import { useEffect, useState } from "react";
import { Play, Pause, Camera } from "lucide-react";

const ESTIMATED_H = 60;

function fmt(totalSec) {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Minimalist logged-vs-estimated timer with a neon progress ring. */
export default function TimeTracker() {
  const [sec, setSec] = useState(42.5 * 3600);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setSec((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [running]);

  const pct = Math.min(sec / (ESTIMATED_H * 3600), 1);
  const R = 30;
  const C = 2 * Math.PI * R;

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-4">
        <div className="relative h-[76px] w-[76px] shrink-0">
          <svg viewBox="0 0 76 76" className="h-full w-full -rotate-90">
            <circle cx="38" cy="38" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
            <circle
              cx="38"
              cy="38"
              r={R}
              fill="none"
              stroke="url(#tt-grad)"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - pct)}
              style={{ transition: "stroke-dashoffset 1s linear", filter: "drop-shadow(0 0 6px rgba(6,182,212,0.7))" }}
            />
            <defs>
              <linearGradient id="tt-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#00D395" />
                <stop offset="100%" stopColor="#06B6D4" />
              </linearGradient>
            </defs>
          </svg>
          <span className="absolute inset-0 flex items-center justify-center font-display text-[13px] font-bold">
            {Math.round(pct * 100)}%
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
            Time tracker
          </p>
          <p className="mt-1 font-display text-xl font-bold tabular-nums">
            {fmt(Math.floor(sec))}
          </p>
          <p className="text-[11px] text-white/40">of {ESTIMATED_H}h estimated</p>
        </div>

        <button
          onClick={() => setRunning((r) => !r)}
          aria-label={running ? "Pause timer" : "Start timer"}
          className={
            running
              ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-neon/40 bg-neon/15 text-neon shadow-[0_0_18px_rgba(6,182,212,0.4)] transition-transform hover:scale-105"
              : "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.05] text-white/70 transition-transform hover:scale-105"
          }
        >
          {running ? <Pause className="h-4.5 w-4.5" /> : <Play className="ml-0.5 h-4.5 w-4.5" />}
        </button>
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5 text-[11px] text-white/45">
        <Camera className="h-3.5 w-3.5 text-brand-soft" />
        Proof of work · 214 screenshots captured this week
        <span className="ml-auto h-1.5 w-1.5 animate-pulse-soft rounded-full bg-mint" />
      </div>
    </div>
  );
}
