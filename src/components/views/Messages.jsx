import { useEffect, useRef, useState } from "react";
import { Search, Send, Paperclip, BadgeCheck, Info, X } from "lucide-react";
import { CONVERSATIONS, THREADS } from "../../data/appMock.js";
import { TALENT } from "../../data/mock.js";
import { useLive } from "../../live.jsx";

// Small, view-local enrichment — keyed by CONVERSATIONS[].id — for the
// "Details" side panel. Kept here rather than in appMock.js since it's
// presentation-only and only Messages needs it.
const PROJECT_TAGS = {
  1: "Checkout flow revamp",
  2: "Design tokens audit",
  3: "Milestone 2 review",
  4: "Rive motion exports",
};

const SHARED_FILES = {
  1: [{ name: "checkout-v0.9.2.diff", size: "12 KB" }, { name: "escrow-animation.mp4", size: "3.4 MB" }],
  2: [{ name: "design-tokens.json", size: "8 KB" }],
  3: [{ name: "milestone-2-summary.pdf", size: "440 KB" }],
  4: [{ name: "rive-export-final.zip", size: "18 MB" }, { name: "scene-list.txt", size: "2 KB" }],
};

function DetailsPanel({ active }) {
  const talent = TALENT.find((t) => t.name === active.name);
  const files = SHARED_FILES[active.id] || [];

  return (
    <div className="h-full overflow-y-auto p-5">
      <div className="flex flex-col items-center text-center">
        <span className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand/50 to-neon/40 font-display text-[16px] font-bold ring-1 ring-white/15">
          {active.initials}
          {active.online && (
            <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-ink bg-mint" />
          )}
        </span>
        <p className="mt-3 flex items-center gap-1.5 text-[14.5px] font-semibold">
          {active.name}
          <BadgeCheck className="h-4 w-4 text-neon" />
        </p>
        <p className="text-[12px] text-white/45">{active.role}</p>
        <p className={`mt-1 text-[11px] font-medium ${active.online ? "text-mint" : "text-white/35"}`}>
          {active.online ? "Online now" : "Last seen recently"}
        </p>
      </div>

      {talent && (
        <div className="mt-5 grid grid-cols-3 gap-2 border-y border-white/8 py-4 text-center">
          <div>
            <p className="font-display text-[13px] font-bold">{talent.rating}★</p>
            <p className="text-[9px] uppercase tracking-wider text-white/35">Rating</p>
          </div>
          <div>
            <p className="font-display text-[13px] font-bold">{talent.hired}x</p>
            <p className="text-[9px] uppercase tracking-wider text-white/35">Hired</p>
          </div>
          <div>
            <p className="font-display text-[13px] font-bold">{talent.rate}</p>
            <p className="text-[9px] uppercase tracking-wider text-white/35">Rate</p>
          </div>
        </div>
      )}

      {talent && (
        <div className="mt-5">
          <p className="text-[10.5px] font-semibold uppercase tracking-wider text-white/35">Skills</p>
          <div className="mt-2 flex flex-wrap justify-center gap-1.5">
            {talent.skills.map((s) => (
              <span key={s} className="rounded-full border border-white/10 px-2.5 py-1 text-[10.5px] text-white/55">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5">
        <p className="text-[10.5px] font-semibold uppercase tracking-wider text-white/35">Project</p>
        <p className="mt-2 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5 text-[12.5px] text-white/70">
          {PROJECT_TAGS[active.id]}
        </p>
      </div>

      {files.length > 0 && (
        <div className="mt-5">
          <p className="text-[10.5px] font-semibold uppercase tracking-wider text-white/35">Shared files</p>
          <div className="mt-2 space-y-1.5">
            {files.map((f) => (
              <div key={f.name} className="flex items-center gap-2.5 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
                <Paperclip className="h-3.5 w-3.5 shrink-0 text-white/35" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-medium text-white/80">{f.name}</p>
                  <p className="text-[10px] text-white/35">{f.size}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Messages() {
  const { inbox, markMessagesRead } = useLive();
  const [active, setActive] = useState(CONVERSATIONS[0]);
  const [threads, setThreads] = useState(() => ({ ...THREADS }));
  const thread = threads[active.id] || [];
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
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

      <div className="glass relative mt-7 grid overflow-hidden rounded-2xl md:grid-cols-[300px_1fr] xl:grid-cols-[300px_1fr_280px]">
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
            <span className="ml-auto hidden rounded-full border border-white/10 px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-white/45 sm:inline-block">
              {PROJECT_TAGS[active.id]}
            </span>
            <button
              onClick={() => setShowDetails(true)}
              aria-label="Show details"
              className="rounded-lg p-2 text-white/40 transition-colors hover:bg-white/5 hover:text-white xl:hidden"
            >
              <Info className="h-4.5 w-4.5" />
            </button>
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

        {/* Details — persistent 3rd column on xl+, slide-over below that */}
        <div className="hidden border-l border-white/8 xl:block">
          <DetailsPanel active={active} />
        </div>
      </div>

      {showDetails && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm xl:hidden" onClick={() => setShowDetails(false)} />
          <div className="fixed inset-y-0 right-0 z-50 w-[300px] max-w-[85vw] animate-feed-in border-l border-white/10 bg-[#0d1411] xl:hidden">
            <div className="flex items-center justify-between border-b border-white/8 p-4">
              <p className="text-[13px] font-bold">Details</p>
              <button onClick={() => setShowDetails(false)} aria-label="Close details" className="rounded-lg p-1.5 text-white/50 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <DetailsPanel active={active} />
          </div>
        </>
      )}
    </div>
  );
}
