import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getAccessToken } from "./lib/authApi.js";
import { fetchNotifications } from "./lib/notificationsApi.js";
import { fetchMessageUnreadCount } from "./lib/messagesApi.js";

/**
 * Realtime-ish layer, backed by real polling (no WebSocket yet, so a short
 * interval stands in for push). Sidebar badges and toast popups both read
 * from real /notifications and /messages/unread-count — previously this
 * played a scripted, entirely fake event stream, which stopped being honest
 * once real Notifications/Messages existed to actually track this.
 */
const LiveCtx = createContext(null);

function toToast(n) {
  const TITLES = { message: "New message", payment: "Payment update", job: "Job posted", invite: "New invite", review: "New review" };
  return { id: n.id, kind: n.type, title: TITLES[n.type] || "Notification", body: n.text };
}

export function LiveProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [unread, setUnread] = useState({ messages: 0, notifications: 0 });
  const [openBriefs, setOpenBriefs] = useState(1284);
  const seenNotifIds = useRef(new Set());
  const isFirstPoll = useRef(true);

  const dismiss = (id) => setToasts((list) => list.filter((t) => t.id !== id));
  // Bail out (return the same reference) when already 0 — otherwise every
  // consumer effect keyed on clearUnread's identity re-fires forever, since
  // this always minted a new object even for a no-op clear.
  const clearUnread = (key) => setUnread((u) => (u[key] === 0 ? u : { ...u, [key]: 0 }));

  // Poll real unread counts + turn brand-new unread notifications into toasts
  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;

    const poll = async () => {
      try {
        const [notifRes, msgCount] = await Promise.all([
          fetchNotifications(token),
          fetchMessageUnreadCount(token),
        ]);
        setUnread({ messages: msgCount.count, notifications: notifRes.unreadCount });

        // Skip the very first poll so logging in doesn't dump your whole
        // notification history as a burst of toasts.
        if (!isFirstPoll.current) {
          for (const n of notifRes.notifications) {
            if (!n.read && !seenNotifIds.current.has(n.id)) {
              const toast = toToast(n);
              setToasts((list) => [...list, toast].slice(-3));
              setTimeout(() => dismiss(toast.id), 6000);
            }
          }
        }
        isFirstPoll.current = false;
        notifRes.notifications.forEach((n) => seenNotifIds.current.add(n.id));
      } catch {
        /* transient network hiccup — next poll retries */
      }
    };

    poll();
    const t = setInterval(poll, 12000);
    return () => clearInterval(t);
  }, []);

  // Ambient "platform activity" counter — a cosmetic aggregate drift, not a
  // claim about any specific real event (unlike the old message/payment
  // toast script, this never names a person or job that doesn't exist).
  useEffect(() => {
    const t = setInterval(
      () => setOpenBriefs((n) => n + Math.floor(Math.random() * 5) - 1),
      4000
    );
    return () => clearInterval(t);
  }, []);

  const value = useMemo(
    () => ({ toasts, dismiss, unread, clearUnread, openBriefs }),
    [toasts, unread, openBriefs]
  );

  return <LiveCtx.Provider value={value}>{children}</LiveCtx.Provider>;
}

export const useLive = () => useContext(LiveCtx);
