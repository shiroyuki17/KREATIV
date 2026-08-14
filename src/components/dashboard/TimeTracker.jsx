import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "../../i18n.jsx";
import { shortDate } from "../../lib/dates.js";
import { Play, Square, Loader2, AlertCircle, Trash2 } from "lucide-react";
import {
  fetchTimeEntries, startTimer, stopTimer, deleteTimeEntry,
} from "../../lib/contractApi.js";

// Гэрээн дээр ажилласан бодит цаг.
//
// Хуучин хувилбар нь 42.5 цагаас эхлээд секунд тутам өсдөг чимэглэл байсан —
// ард нь ямар ч өгөгдөл байгаагүй, хуудас дахин ачаалахад эхнээсээ эхэлдэг
// байв. Одоо сервер эхлэл/төгсгөлийн мөчийг хадгалж, нийт хугацааг өөрөө
// тооцдог: клиентийн цаг найдваргүй бөгөөд цагийн хөлсний ажилд энэ нь
// шууд мөнгө.

function fmt(totalSec) {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function fmtHours(totalSec) {
  return `${(totalSec / 3600).toFixed(1)}h`;
}

export default function TimeTracker({ contractId }) {
  const { t, locale } = useI18n();
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // Ажиллаж буй тоолуурыг секунд тутам "урагшлуулах" — сервер рүү секунд
  // тутам хүсэлт явуулахгүйгээр амьд харагдуулна.
  const [tick, setTick] = useState(0);
  const cancelled = useRef(false);

  const load = useCallback(async () => {
    try {
      const res = await fetchTimeEntries(contractId);
      if (!cancelled.current) { setData(res); setError(""); }
    } catch (err) {
      if (!cancelled.current) setError(err.message);
    }
  }, [contractId]);

  useEffect(() => {
    cancelled.current = false;
    load();
    return () => { cancelled.current = true; };
  }, [load]);

  useEffect(() => {
    if (!data?.running) return undefined;
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [data?.running]);

  if (!contractId) return null;

  async function toggle() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (data?.running) await stopTimer(contractId);
      else await startTimer(contractId);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeEntry(id) {
    setError("");
    try {
      await deleteTimeEntry(id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!data) {
    return <div className="glass animate-pulse-soft h-40 rounded-2xl" />;
  }

  // Ажиллаж буй тоолуурын өнгөрсөн хугацааг клиент талд нэмж харуулна.
  // `tick` нь дахин render хийлгэх зорилготой; тооцоолол нь серверийн
  // эхэлсэн мөчид тулгуурладаг тул хөтчийн цаг гажсан ч дүн зөрөхгүй.
  const liveExtra = data.running
    ? Math.max(0, (Date.now() - new Date(data.running.startedAt).getTime()) / 1000 - data.running.seconds)
    : 0;
  const total = data.totalSeconds + liveExtra;

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-white/40">
            {t("tt.timeLogged")}
          </p>
          <p className="mt-1.5 font-display text-3xl font-bold tabular-nums">
            {data.running ? fmt(total) : fmtHours(total)}
          </p>
          {data.running && (
            <p className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-medium text-mint">
              <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-mint" />
              {t("tt.running")}
            </p>
          )}
        </div>

        {data.canTrack && (
          <button
            onClick={toggle}
            disabled={busy}
            aria-label={data.running ? t("tt.stopTimer") : t("tt.startTimer")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold transition-all disabled:opacity-50 ${
              data.running
                ? "border border-white/15 text-white/80 hover:border-red-400/40 hover:text-red-300"
                : "bg-brand text-ink glow-brand"
            }`}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : data.running ? (
              <Square className="h-3.5 w-3.5" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
            {data.running ? t("tt.stop") : t("tt.start")}
          </button>
        )}
      </div>

      {error && (
        <p className="mt-3 flex items-center gap-1.5 text-[12px] text-red-400">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
        </p>
      )}

      {data.entries.length === 0 ? (
        <p className="mt-4 text-[12.5px] text-white/40">
          {data.canTrack
            ? t("tt.noTimeSelf")
            : t("tt.noTimeOther")}
        </p>
      ) : (
        <ul className="mt-4 space-y-1.5 border-t border-white/8 pt-3">
          {data.entries.slice(0, 5).map((e) => (
            <li key={e.id} className="group flex items-center justify-between gap-3 text-[12px]">
              <span className="text-white/45">{shortDate(e.startedAt, locale)}</span>
              <span className="flex-1 truncate text-white/60">{e.note || ""}</span>
              <span className="tabular-nums font-medium text-white/80">
                {e.running ? t("tt.running") : fmtHours(e.seconds)}
              </span>
              {data.canTrack && !e.running && (
                <button
                  onClick={() => removeEntry(e.id)}
                  aria-label={t("tt.deleteEntry")}
                  className="text-white/25 opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
