import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { hasSession, getAccessToken } from "./lib/authApi.js";
import { fetchNotifications } from "./lib/notificationsApi.js";
import { fetchMessageUnreadCount } from "./lib/messagesApi.js";
import { fetchPublicStats } from "./lib/analyticsApi.js";

/**
 * Realtime давхарга — sidebar-ийн badge болон toast popup-ууд.
 *
 * Өмнө нь энэ нь 12 секунд тутам /notifications + /messages/unread-count
 * руу poll хийдэг байв: socket холболт аль хэдийн байсаар байтал нэвтэрсэн
 * хэрэглэгч бүр цагт ~600 нэмэлт хүсэлт үүсгэж, түүнийхээ хариуд мэдэгдлээ
 * 12 секунд хүртэл хоцорч авдаг байлаа. Одоо:
 *
 *   • Эхлэхэд НЭГ удаа татаж эхний төлөвөө тогтооно.
 *   • Цаашид бүх шинэчлэлт socket-оор ирнэ ("notification:new",
 *     "message:new") — сервер тухай бүрд нь шинэ unread тоог хамт явуулна.
 *   • Socket тасарч дахин холбогдох үед л дахин татна: салсан хугацаанд
 *     алдагдсан эвентүүдийг ингэж нөхнө.
 */
const LiveCtx = createContext(null);

function toToast(n) {
  const TITLES = { message: "New message", payment: "Payment update", job: "Job posted", invite: "New invite", review: "New review" };
  return { id: n.id, kind: n.type, title: TITLES[n.type] || "Notification", body: n.text };
}

export function LiveProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [unread, setUnread] = useState({ messages: 0, notifications: 0 });
  const [openBriefs, setOpenBriefs] = useState(null);
  const seenNotifIds = useRef(new Set());

  const dismiss = (id) => setToasts((list) => list.filter((t) => t.id !== id));
  // Bail out (return the same reference) when already 0 — otherwise every
  // consumer effect keyed on clearUnread's identity re-fires forever, since
  // this always minted a new object even for a no-op clear.
  const clearUnread = (key) => setUnread((u) => (u[key] === 0 ? u : { ...u, [key]: 0 }));

  useEffect(() => {
    if (!hasSession()) return undefined;

    let cancelled = false;

    const pushToast = (notification) => {
      if (!notification || notification.read) return;
      if (seenNotifIds.current.has(notification.id)) return;
      seenNotifIds.current.add(notification.id);
      const toast = toToast(notification);
      setToasts((list) => [...list, toast].slice(-3));
      setTimeout(() => dismiss(toast.id), 6000);
    };

    // Эхний (болон дахин холбогдсоны дараах) төлөв. Энд ирсэн мэдэгдлүүдийг
    // toast болгохгүй — зөвхөн "үзсэн" гэж тэмдэглэнэ. Эс тэгвэл нэвтрэх
    // болгонд бүх түүх нэг дор toast болж цутгана.
    const hydrate = async () => {
      try {
        const [notifRes, msgCount] = await Promise.all([
          fetchNotifications(),
          fetchMessageUnreadCount(),
        ]);
        if (cancelled) return;
        setUnread({ messages: msgCount.count, notifications: notifRes.unreadCount });
        notifRes.notifications.forEach((n) => seenNotifIds.current.add(n.id));
      } catch {
        /* сүлжээний түр зуурын алдаа — дараагийн reconnect дээр дахин оролдоно */
      }
    };

    hydrate();

    const onNotification = ({ notification, unreadCount }) => {
      setUnread((u) => ({ ...u, notifications: unreadCount ?? u.notifications + 1 }));
      pushToast(notification);
    };
    const onMessage = ({ unreadCount }) => {
      setUnread((u) => ({ ...u, messages: unreadCount ?? u.messages + 1 }));
    };
    // Салсан хугацаанд ирсэн эвентүүд алдагдсан байж болзошгүй тул
    // дахин холбогдоход төлөвөө бүхэлд нь сэргээнэ.
    const onReconnect = () => hydrate();

    // socket.io-client-ийг ДИНАМИКААР ачаална: LiveProvider нь апп-ын
    // үндэст (нүүр хуудсанд ч) байрладаг тул статик import хийвэл ~40 KB
    // realtime сан нэвтрээгүй зочны эхний ачаалалтад ч ордог. Энд зөвхөн
    // session байгаа үед л татагдана.
    let detach = null;
    import("./lib/socket.js").then(({ connectSocket }) => {
      if (cancelled) return;
      const socket = connectSocket(getAccessToken());
      socket.on("notification:new", onNotification);
      socket.on("message:new", onMessage);
      socket.io.on("reconnect", onReconnect);
      detach = () => {
        socket.off("notification:new", onNotification);
        socket.off("message:new", onMessage);
        socket.io.off("reconnect", onReconnect);
      };
    }).catch((err) => {
      // Чимээгүй залгих ёсгүй: энэ салбар унавал realtime давхарга бүхэлдээ
      // үхэх бөгөөд UI нь ердөө "мэдэгдэл ирэхгүй" гэж харагдана — маш
      // хэцүү оношлогддог. Хэрэглэгчийн урсгалыг зогсоохгүй ч мөрөө үлдээнэ.
      console.error("[live] realtime холболт үүсгэж чадсангүй:", err);
    });

    return () => {
      cancelled = true;
      detach?.();
    };
  }, []);

  // "Нээлттэй брифүүд" — BentoShowcase дээр харагддаг тоо. Өмнө нь 1284-өөс
  // эхлээд 4 секунд тутам санамсаргүйгээр өөрчлөгддөг чимэглэл байсан
  // (Math.random) — өөрөөр хэлбэл зохиомол тоо. Одоо /analytics/public-ийн
  // бодит нээлттэй ажлын тоо.
  useEffect(() => {
    let cancelled = false;
    fetchPublicStats()
      .then((s) => { if (!cancelled) setOpenBriefs(s.openJobs); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const value = useMemo(
    () => ({ toasts, dismiss, unread, clearUnread, openBriefs }),
    [toasts, unread, openBriefs]
  );

  return <LiveCtx.Provider value={value}>{children}</LiveCtx.Provider>;
}

export const useLive = () => useContext(LiveCtx);
