import { useEffect, useState } from "react";
import { CircleDollarSign, MessageSquare, Mail, Star, Info, Briefcase, CheckCheck, AlertCircle, Bell } from "lucide-react";
import { useNav } from "../../nav.jsx";
import { useI18n } from "../../i18n.jsx";
import { clockTime } from "../../lib/dates.js";
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
  return sameDay ? "today" : "earlier";
}

export default function Notifications() {
  const { t, locale } = useI18n();
  const { nav, user } = useNav();
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
  const groups = [["today", t("nt.today")], ["earlier", t("nt.earlier")]];

  // Дарахад уншсанаар тэмдэглээд, Notification.link байвал ШУУД тийш
  // шилжинэ. Өмнө нь зөвхөн уншсан болгодог байсан тул хэрэглэгч мэдэгдлээ
  // хараад дараа нь өөрөө холбогдох хуудсаа гараар хайх шаардлагатай байв.
  const openNotification = (n) => {
    if (!n.read) {
      setItems((arr) => arr.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      markNotificationRead(n.id, getAccessToken()).catch(() => {});
    }
    // "profile" нь vнэлгээний мэдэгдэл — хэрэглэгчийн ӨӨРИЙН профайл.
    // FreelancerProfile нь params.userId-гvйгээр хоосон хуудас гаргадаг тул
    // заавал дамжуулна.
    if (n.link === "profile") nav("profile", { userId: user?.id });
    else if (n.link) nav(n.link);
  };

  const markAllRead = () => {
    setItems((arr) => arr.map((n) => ({ ...n, read: true })));
    markAllNotificationsRead(getAccessToken()).catch(() => {});
  };

  return (
    <div className="mx-auto max-w-4xl px-6 pb-24 pt-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-white">{t("notif.title")}</h1>
          <p className="mt-1.5 text-[13px] text-white/50">
            {unread > 0 ? t("nt.unreadCount", { count: unread }) : t("nt.allRead")}
          </p>
        </div>
        {unread > 0 && (
          <button
            onClick={markAllRead}
            className="inline-flex items-center gap-2 rounded-xl border border-brand/30 bg-brand/10 px-4 py-2 text-[12.5px] font-semibold text-brand-soft transition-all hover:bg-brand/20 glow-brand"
          >
            <CheckCheck className="h-4 w-4" /> {t("nt.markAllRead")}
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

      {!loading && items.length === 0 && !error && (
        <div className="glass mt-8 rounded-2xl p-12 text-center">
          <Bell className="mx-auto h-8 w-8 text-white/20" />
          <p className="mt-4 text-[14px] font-semibold">{t("nt.empty")}</p>
          <p className="mt-1.5 text-[12.5px] text-white/45">{t("nt.emptyHint")}</p>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="mt-6 space-y-6">
          {groups.map(([grp, grpLabel]) => {
            const list = items.filter((n) => groupOf(n.createdAt) === grp);
            if (list.length === 0) return null;
            return (
              <div key={grp} className="space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-widest text-white/40">{grpLabel}</p>
                {list.map((n) => {
                  const meta = META[n.type] || META.system;
                  const { Icon, cls } = meta;
                  return (
                    <button
                      key={n.id}
                      onClick={() => openNotification(n)}
                      className={`group relative flex w-full cursor-pointer items-start gap-4 rounded-2xl border p-4 text-left transition-all ${
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
                          <span className="text-[11px] text-white/40 shrink-0">{n.createdAt ? clockTime(n.createdAt, locale) : t("nt.justNow")}</span>
                        </div>
                      </div>
                      {!n.read && (
                        <span className="h-2 w-2 rounded-full bg-brand glow-brand shrink-0 mt-2" />
                      )}
                    </button>
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
