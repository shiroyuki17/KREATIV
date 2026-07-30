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
    <div className="mx-auto max-w-3xl px-6 pb-24 pt-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="mt-1.5 text-[13px] text-white/45">
            {unread > 0 ? `${unread} unread` : "All caught up"}
          </p>
        </div>
        <button
          onClick={markAllRead}
          disabled={unread === 0}
          className="glass inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[12.5px] font-semibold text-white/70 transition-colors hover:border-mint/40 hover:text-mint disabled:cursor-not-allowed disabled:opacity-40"
        >
          <CheckCheck className="h-4 w-4" />
          Mark all read
        </button>
      </div>

      {error && (
        <p className="mt-5 flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-[12.5px] font-medium text-red-400">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
        </p>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="glass mt-8 rounded-2xl p-10 text-center text-[13px] text-white/45">
          No notifications yet — job posts, payments, and new messages will show up here.
        </div>
      )}

      {groups.map((g) => {
        const groupItems = items.filter((n) => groupOf(n.createdAt) === g);
        if (groupItems.length === 0) return null;
        return (
          <div key={g} className="mt-8">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-white/35">{g}</p>
            <div className="mt-3 space-y-2.5">
              {groupItems.map((n, i) => {
                const { Icon, cls } = META[n.type] || META.system;
                return (
                  <button
                    key={n.id}
                    onClick={() => { markOneRead(n); if (n.link) nav(n.link); }}
                    className={`flex w-full animate-feed-in items-start gap-3.5 rounded-xl border p-4 text-left transition-colors ${
                      !n.read
                        ? "border-brand/25 bg-brand/[0.06] hover:border-brand/45"
                        : "border-white/8 bg-white/[0.02] hover:border-white/15"
                    }`}
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${cls}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] leading-snug text-white/85">{n.text}</p>
                      <p className="mt-1 text-[11px] text-white/35">{new Date(n.createdAt).toLocaleString()}</p>
                    </div>
                    {!n.read && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand shadow-[0_0_8px_rgba(0,211,149,0.8)]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
