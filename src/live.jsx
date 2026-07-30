import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

/**
 * Simulated realtime layer.
 *
 * There's no backend in this prototype, so a timer plays a scripted stream of
 * events (new brief, incoming message, escrow release…). Everything downstream
 * — toasts, sidebar badges, the live counters — reads from here, so swapping
 * this for a WebSocket later only means replacing the `useEffect` below.
 */
const LiveCtx = createContext(null);

const SCRIPT = [
  {
    kind: "brief",
    title: "New brief matched to you",
    body: "Realtime dashboard for a trading desk · $9,500",
    job: {
      id: 101,
      title: "Realtime dashboard for a trading desk",
      client: "Meridian Bank",
      rating: 5.0,
      verified: true,
      type: "Fixed",
      budget: "$9,500",
      cat: "Dev",
      tags: ["React", "WebSocket", "D3"],
      posted: "just now",
      proposals: 0,
      languages: ["English"],
    },
  },
  {
    kind: "message",
    title: "Daniel Kim",
    body: "Just pushed the realtime price feed — take a look when you can.",
    from: 1,
  },
  {
    kind: "payment",
    title: "Escrow released",
    body: "Nova Studio released $1,800 for Milestone 3",
  },
  {
    kind: "brief",
    title: "New brief matched to you",
    body: "Live collaboration cursors for a design tool · $6,200",
    job: {
      id: 102,
      title: "Live collaboration cursors for a design tool",
      client: "Nova Studio",
      rating: 4.9,
      verified: true,
      type: "Fixed",
      budget: "$6,200",
      cat: "Dev",
      tags: ["CRDT", "WebRTC", "React"],
      posted: "just now",
      proposals: 1,
      languages: ["English", "French"],
    },
  },
  {
    kind: "message",
    title: "Ava Torres",
    body: "Design tokens are synced — everything updates live now.",
    from: 2,
  },
];

export function LiveProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [liveJobs, setLiveJobs] = useState([]);
  const [inbox, setInbox] = useState([]); // incoming chat messages
  const [unread, setUnread] = useState({ messages: 3, notifications: 3 });
  const [openBriefs, setOpenBriefs] = useState(1284);
  const step = useRef(0);

  const dismiss = (id) => setToasts((list) => list.filter((t) => t.id !== id));
  // Bail out (return the same reference) when already 0 — otherwise every
  // consumer effect keyed on markMessagesRead's identity re-fires forever,
  // since this always minted a new object even for a no-op clear.
  const clearUnread = (key) => setUnread((u) => (u[key] === 0 ? u : { ...u, [key]: 0 }));
  const markMessagesRead = () => clearUnread("messages");

  // Scripted event stream
  useEffect(() => {
    const timer = setInterval(() => {
      const event = SCRIPT[step.current % SCRIPT.length];
      step.current += 1;
      const id = `${Date.now()}-${step.current}`;

      setToasts((list) => [...list, { ...event, id }].slice(-3));
      setTimeout(() => dismiss(id), 6000);

      if (event.kind === "brief") {
        // the script loops, so mint a fresh id each time to keep React keys unique
        const job = { ...event.job, id: `live-${id}`, isNew: true };
        setLiveJobs((j) => [job, ...j].slice(0, 4));
        setUnread((u) => ({ ...u, notifications: u.notifications + 1 }));
      }
      if (event.kind === "message") {
        setInbox((m) => [...m, { from: event.from, text: event.body, at: Date.now() }]);
        setUnread((u) => ({ ...u, messages: u.messages + 1 }));
      }
      if (event.kind === "payment") {
        setUnread((u) => ({ ...u, notifications: u.notifications + 1 }));
      }
    }, 14000);

    return () => clearInterval(timer);
  }, []);

  // Open-brief counter drifts like a real marketplace
  useEffect(() => {
    const t = setInterval(
      () => setOpenBriefs((n) => n + Math.floor(Math.random() * 5) - 1),
      4000
    );
    return () => clearInterval(t);
  }, []);

  const value = useMemo(
    () => ({ toasts, dismiss, liveJobs, inbox, unread, clearUnread, markMessagesRead, openBriefs }),
    [toasts, liveJobs, inbox, unread, openBriefs]
  );

  return <LiveCtx.Provider value={value}>{children}</LiveCtx.Provider>;
}

export const useLive = () => useContext(LiveCtx);
