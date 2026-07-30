import { useState } from "react";
import {
  Figma,
  FileArchive,
  Video,
  Download,
  Link2,
  RotateCcw,
  ShieldCheck,
  Check,
} from "lucide-react";
import Magnet from "../fx/Magnet.jsx";
import { FILES } from "../../data/mock.js";

const ICONS = {
  figma: { Icon: Figma, cls: "text-brand-soft bg-brand/15 border-brand/30" },
  zip: { Icon: FileArchive, cls: "text-neon bg-neon/10 border-neon/30" },
  video: { Icon: Video, cls: "text-mint bg-mint/10 border-mint/30" },
};

/** Glassmorphic deliverable hub with revision / release actions. */
export default function DeliverableHub({ onApprove, onRevision, approved }) {
  const [link, setLink] = useState("");

  return (
    <div className="glass flex h-full flex-col rounded-2xl p-6">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
          Deliverable hub
        </p>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-mint">
          <ShieldCheck className="h-3.5 w-3.5" />
          $2,400 in escrow
        </span>
      </div>

      <div className="mt-5 space-y-2.5">
        {FILES.map((f) => {
          const { Icon, cls } = ICONS[f.kind];
          return (
            <div
              key={f.name}
              className="group flex items-center gap-3.5 rounded-xl border border-white/8 bg-white/[0.03] p-3.5 transition-colors hover:border-brand/40"
            >
              <span className={`flex h-10 w-10 items-center justify-center rounded-lg border ${cls}`}>
                <Icon className="h-4.5 w-4.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold">{f.name}</p>
                <p className="text-[11px] text-white/40">
                  {f.meta} · {f.time}
                </p>
              </div>
              <button
                aria-label={`Download ${f.name}`}
                className="rounded-lg border border-white/10 p-2 text-white/40 opacity-0 transition-all hover:border-brand/40 hover:text-white group-hover:opacity-100"
              >
                <Download className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-2 pl-3.5">
        <Link2 className="h-4 w-4 shrink-0 text-white/35" />
        <input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="Paste a Figma / repo / preview link…"
          className="w-full bg-transparent text-[12.5px] outline-none placeholder:text-white/30"
        />
        <button className="shrink-0 rounded-lg bg-white/8 px-3.5 py-2 text-[12px] font-semibold text-white/70 transition-colors hover:bg-white/15">
          Submit
        </button>
      </div>

      <div className="mt-auto flex flex-col gap-3 pt-6 sm:flex-row">
        <button
          onClick={onRevision}
          disabled={approved}
          className="flex-1 rounded-xl border border-white/15 bg-white/[0.04] py-3 text-[13px] font-semibold text-white/75 transition-colors hover:border-amber-400/50 hover:text-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span className="inline-flex items-center gap-2">
            <RotateCcw className="h-4 w-4" />
            Request Revision
          </span>
        </button>
        <Magnet strength={0.15} className="flex-1">
          <button
            onClick={onApprove}
            disabled={approved}
            className={
              approved
                ? "w-full cursor-default rounded-xl bg-mint/20 py-3 text-[13px] font-semibold text-mint"
                : "w-full rounded-xl bg-gradient-to-r from-mint to-emerald-400 py-3 text-[13px] font-bold text-ink glow-mint transition-shadow hover:shadow-[0_0_44px_rgba(16,185,129,0.6)]"
            }
          >
            <span className="inline-flex items-center gap-2">
              {approved ? (
                <>
                  <Check className="h-4 w-4" />
                  Payment Released
                </>
              ) : (
                "Approve & Release Payment"
              )}
            </span>
          </button>
        </Magnet>
      </div>
    </div>
  );
}
