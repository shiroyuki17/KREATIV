import { useEffect, useRef, useState } from "react";
import { Search, Send, Paperclip, BadgeCheck } from "lucide-react";
import { CONVERSATIONS, THREADS } from "../../data/appMock.js";
import { useLive } from "../../live.jsx";

export default function Messages() {
  const { inbox, markMessagesRead } = useLive();
  const [active, setActive] = useState(CONVERSATIONS[0]);
  const [threads, setThreads] = useState(() => ({ ...THREADS }));
  const thread = threads[active.id] || [];
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const seen = useRef(0);
  const bottomRef = useRef(null);

  // Opening the inbox clears the unread badge
  useEffect(() => { markMessagesRead(); }, [markMessagesRead]);

  // Realtime: incoming messages arrive with a typing indicator first — but
  // only when their conversation is the one currently open. Messages for a
  // different contact are appended straight away, so switching to that
  // conversation later still shows them (previously they were marked "seen"
  // and silently dropped instead).
  useEffect(() => {
    if (inbox.length <= seen.current) return;
    const fresh = inbox.slice(seen.current);
    seen.current = inbox.length;

    fresh.forEach((msg) => {
      const isActiveConvo = msg.from === active.id;
      const append = () =>
        setThreads((t) => ({
          ...t,
          [msg.from]: [...(t[msg.from] || []), { from: "them", text: msg.text, time: "now" }],
        }));

      if (!isActiveConvo) { append(); return; }
      setTyping(true);
      setTimeout(() => {
        setTyping(false);
        append();
      }, 1800);
    });
  }, [inbox, active.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [thread, typing]);

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setThreads((t) => ({
      ...t,
      [active.id]: [...(t[active.id] || []), { from: "me", text, time: "now" }],
    }));
    setDraft("");
  };

  return (
    <div className="mx-auto max-w-6xl px-6 pb-16 pt-8">
      <h1 className="font-display text-3xl font-bold tracking-tight">Messages</h1>

      <div className="glass mt-7 grid overflow-hidden rounded-2xl md:grid-cols-[320px_1fr]">
        {/* Conversation list */}
        <div className="border-b border-white/8 md:border-b-0 md:border-r">
          <div className="flex items-center gap-2 border-b border-white/8 p-4">
            <Search className="h-4 w-4 shrink-0 text-white/35" />
            <input
              placeholder="Search conversations…"
              className="w-full bg-transparent text-[13px] outline-none placeholder:text-white/30"
            />
          </div>
          <div className="max-h-[420px] overflow-y-auto md:max-h-[520px]">
            {CONVERSATIONS.map((c) => (
              <button
                key={c.id}
                onClick={() => setActive(c)}
                className={`flex w-full items-center gap-3 border-b border-white/5 p-4 text-left transition-colors ${
                  active.id === c.id ? "bg-brand/10" : "hover:bg-white/[0.03]"
                }`}
              >
                <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand/50 to-neon/40 font-display text-[12px] font-bold ring-1 ring-white/15">
                  {c.initials}
                  {c.online && (
                    <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-ink bg-mint" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-[13.5px] font-semibold">{c.name}</span>
                    <span className="shrink-0 text-[10.5px] text-white/35">{c.time}</span>
                  </span>
                  <span className="mt-0.5 flex items-center justify-between gap-2">
                    <span className="truncate text-[12px] text-white/45">{c.last}</span>
                    {c.unread > 0 && (
                      <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-brand text-[9.5px] font-bold glow-brand">
                        {c.unread}
                      </span>
                    )}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Thread */}
        <div className="flex min-h-[480px] flex-col">
          <div className="flex items-center gap-3 border-b border-white/8 p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand/50 to-neon/40 font-display text-[11px] font-bold ring-1 ring-white/15">
              {active.initials}
            </span>
            <div>
              <p className="flex items-center gap-1.5 text-[14px] font-semibold">
                {active.name}
                <BadgeCheck className="h-4 w-4 text-neon" />
              </p>
              <p className="text-[11px] text-mint">
                {active.online ? "Online now" : "Last seen recently"}
              </p>
            </div>
            <span className="ml-auto rounded-full border border-white/10 px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-white/45">
              Checkout flow revamp
            </span>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-5">
            {thread.map((m, i) => (
              <div
                key={i}
                className={`flex animate-feed-in ${m.from === "me" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={
                    m.from === "me"
                      ? "max-w-[75%] rounded-2xl rounded-br-md bg-gradient-to-r from-brand to-brand-soft px-4 py-2.5 text-[13.5px] leading-relaxed shadow-[0_0_20px_rgba(0,211,149,0.25)]"
                      : "max-w-[75%] rounded-2xl rounded-bl-md border border-white/8 bg-white/[0.05] px-4 py-2.5 text-[13.5px] leading-relaxed text-white/85"
                  }
                >
                  {m.text}
                  <span className={`mt-1 block text-[10px] ${m.from === "me" ? "text-ink/60" : "text-white/30"}`}>
                    {m.time}
                  </span>
                </div>
              </div>
            ))}

            {typing && (
              <div className="flex animate-feed-in justify-start">
                <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-white/8 bg-white/[0.05] px-4 py-3">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-brand-soft"
                      style={{ animationDelay: `${i * 0.18}s` }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="flex items-center gap-2 border-t border-white/8 p-3.5">
            <button aria-label="Attach a file" className="rounded-lg p-2.5 text-white/40 transition-colors hover:bg-white/5 hover:text-white">
              <Paperclip className="h-4.5 w-4.5" />
            </button>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Write a message…"
              className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-[13.5px] outline-none transition-colors placeholder:text-white/30 focus:border-brand/50"
            />
            <button
              onClick={send}
              aria-label="Send message"
              className="rounded-xl bg-brand p-2.5 glow-brand transition-shadow hover:shadow-[0_0_30px_rgba(0,211,149,0.6)]"
            >
              <Send className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
