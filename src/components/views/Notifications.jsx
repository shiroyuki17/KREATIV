import { useEffect, useState } from "react";
import { CircleDollarSign, MessageSquare, Mail, Star, Info, Briefcase, CheckCheck, AlertCircle } from "lucide-react";
import { useNav } from "../../nav.jsx";
import { getAccessToken } from "../../lib/authApi.js";
import { fetchNotifications, markNotificationRead, markAllNotificationsRead } from "../../lib/notificationsApi.js";

const META = {
  payment: { Icon: CircleDollarSign, cls: "text-mint border-mint/30 bg-mint/10" },
  message: { Icon: MessageSquare, cls: "text-neon border-neon/30 bg-neon/10" },
  job: { Icon: Briefcase, cls: "text-brand-soft border-brand/30 bg-brand/10" },
  invite: { Icon: Mail, cls: "text-brand-soft border-brand/30 bg-brand/10" },
  review: { Icon: Star, cls: "text-amber-400 border-amber-400/30 bg-amber-400/10" },
  system: { Icon: Info, cls: "text-white/60 border-white/15 bg-white/[0.05]" },
};

function groupOf(iso) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay ? "Today" : "Earlier";
}

export default function Notifications() {
  const { nav } = useNav();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = getAccessToken();
    if (!token) { setLoading(false); return; }
    fetchNotifications(token)
      .then((res) => setItems(res.notifications))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const unread = items.filter((n) => !n.read).length;
  const groups = ["Today", "Earlier"];

  const markOneRead = (n) => {
    if (n.read) return;
    setItems((arr) => arr.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    markNotificationRead(n.id, getAccessToken()).catch(() => {});
  };

  const markAllRead = () => {
    setItems((arr) => arr.map((n) => ({ ...n, read: true })));
    markAllNotificationsRead(getAccessToken()).catch(() => {});
  };

  return (
    <div className="mx-auto max-w-4xl px-6 pb-24 pt-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-white">Notifications</h1>
          <p className="mt-1.5 text-[13px] text-white/50">
            {unread > 0 ? `${unread} unread notifications` : "All caught up! No unread notifications."}
          </p>
        </div>
        {unread > 0 && (
          <button
            onClick={markAllRead}
            className="inline-flex items-center gap-2 rounded-xl border border-brand/30 bg-brand/10 px-4 py-2 text-[12.5px] font-semibold text-brand-soft transition-all hover:bg-brand/20 glow-brand"
          >
            <CheckCheck className="h-4 w-4" /> Mark all read
          </button>
        )}
      </div>

      {loading && (
        <div className="mt-8 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 w-full animate-pulse rounded-xl border border-white/5 bg-white/[0.02]" />
          ))}
        </div>
      )}

      {error && (
        <div className="mt-6 flex items-center gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-[13px] text-red-400">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!loading && items.length === 0 && !error && (
        <div className="glass mt-8 rounded-2xl p-12 text-center">
          <Info className="mx-auto h-10 w-10 text-white/20" />
          <p className="mt-4 text-[14.5px] font-semibold text-white/70">No notifications yet</p>
          <p className="mt-1 text-[12.5px] text-white/40">You're all set! Activity on your jobs and messages will appear here.</p>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="mt-6 space-y-6">
          {groups.map((grp) => {
            const list = items.filter((n) => groupOf(n.createdAt) === grp);
            if (list.length === 0) return null;
            return (
              <div key={grp} className="space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-widest text-white/40">{grp}</p>
                {list.map((n) => {
                  const meta = META[n.type] || META.system;
                  const { Icon, cls } = meta;
                  return (
                    <div
                      key={n.id}
                      onClick={() => markOneRead(n)}
                      className={`group relative flex cursor-pointer items-start gap-4 rounded-2xl border p-4 transition-all ${
                        n.read
                          ? "border-white/5 bg-white/[0.02] hover:border-white/15"
                          : "border-brand/30 bg-gradient-to-r from-brand/10 via-white/[0.04] to-transparent"
                      }`}
                    >
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${cls}`}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-[13px] leading-relaxed ${n.read ? "text-white/70" : "text-white"}`}>
                            {n.text}
                          </p>
                          <span className="text-[11px] text-white/40 shrink-0">{n.createdAt ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now"}</span>
                        </div>
                      </div>
                      {!n.read && (
                        <span className="h-2 w-2 rounded-full bg-brand glow-brand shrink-0 mt-2" />
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
