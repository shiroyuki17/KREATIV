import { useEffect, useRef, useState } from "react";
import { Search, Send, Info, X, AlertCircle, ShieldAlert } from "lucide-react";
import { useNav } from "../../nav.jsx";
import { getAccessToken, avatarSrc } from "../../lib/authApi.js";
import { fetchConversations, startConversation, fetchThread, sendMessage } from "../../lib/messagesApi.js";
import { connectSocket } from "../../lib/socket.js";

function initialsOf(name) {
  return (name || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function formatClock(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function Avatar({ name, avatarUrl, size = "h-11 w-11" }) {
  const src = avatarSrc(avatarUrl);
  return (
    <span className={`relative flex ${size} shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-brand/50 to-neon/40 font-display text-[12px] font-bold ring-1 ring-white/15`}>
      {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : initialsOf(name)}
    </span>
  );
}

function DetailsPanel({ contact }) {
  return (
    <div className="h-full overflow-y-auto p-5">
      <div className="flex flex-col items-center text-center">
        <Avatar name={contact.name} avatarUrl={contact.avatarUrl} size="h-16 w-16" />
        <p className="mt-3 text-[14.5px] font-semibold">{contact.name}</p>
        <p className="mt-1 text-[11px] text-white/35">No shared identity/rating data to show yet</p>
      </div>
    </div>
  );
}

export default function Messages() {
  const { params, user } = useNav();
  const myId = user?.id;
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [thread, setThread] = useState([]);
  const [draft, setDraft] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [leakageWarning, setLeakageWarning] = useState(null);
  const bottomRef = useRef(null);
  const activeIdRef = useRef(null);
  activeIdRef.current = activeId;

  const active = conversations.find((c) => c.id === activeId) || null;

  // FR-5.1: socket.io — шинэ зурвас ирмэгц polling-ийг хүлээхгүйгээр шууд
  // харуулна (polling-ийг доор аюулгүйн сүлжээ болгож хэвээр үлдээв).
  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    const socket = connectSocket(token);
    const onMessage = ({ conversationId, message }) => {
      if (conversationId === activeIdRef.current) {
        setThread((t) => (t.some((m) => m.id === message.id) ? t : [...t, message]));
      }
      fetchConversations(token).then((res) => setConversations(res.conversations)).catch(() => {});
    };
    socket.on("message:new", onMessage);
    return () => socket.off("message:new", onMessage);
  }, []);

  // Initial load — if we arrived with a specific person to message
  // (Message button on a talent card/profile), get-or-create that
  // conversation and open it directly.
  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError("");
      try {
        if (params?.withUserId) {
          await startConversation(params.withUserId, token);
        }
        const res = await fetchConversations(token);
        if (cancelled) return;
        setConversations(res.conversations);
        if (params?.withUserId) {
          const match = res.conversations.find((c) => c.with.id === params.withUserId);
          setActiveId(match ? match.id : res.conversations[0]?.id || null);
        } else {
          setActiveId((cur) => cur || res.conversations[0]?.id || null);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.withUserId]);

  // Poll the conversation list (previews/unread for threads you're not viewing)
  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    const t = setInterval(() => {
      fetchConversations(token).then((res) => setConversations(res.conversations)).catch(() => {});
    }, 8000);
    return () => clearInterval(t);
  }, []);

  // Load + poll the open thread
  useEffect(() => {
    const token = getAccessToken();
    if (!token || !activeId) { setThread([]); return; }

    let cancelled = false;
    const load = () => fetchThread(activeId, token).then((res) => { if (!cancelled) setThread(res.messages); }).catch(() => {});
    load();
    const t = setInterval(load, 4000);
    return () => { cancelled = true; clearInterval(t); };
  }, [activeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [thread]);

  const send = async () => {
    const text = draft.trim();
    if (!text || !activeId || sending) return;
    setDraft("");
    setSending(true);
    setLeakageWarning(null);
    try {
      const message = await sendMessage(activeId, text, getAccessToken());
      setThread((t) => [...t, message]);
      if (message.leakageWarning) setLeakageWarning(message.leakageWarning);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-6 pb-16 pt-8">
        <h1 className="font-display text-3xl font-bold tracking-tight">Messages</h1>
        <div className="glass mt-7 flex h-[500px] items-center justify-center rounded-2xl text-[13px] text-white/40">
          Ачааллаж байна…
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 pb-16 pt-8">
      <h1 className="font-display text-3xl font-bold tracking-tight">Messages</h1>

      {error && (
        <p className="mt-4 flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-[12.5px] font-medium text-red-400">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
        </p>
      )}

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
            {conversations.length === 0 && (
              <p className="p-6 text-center text-[12.5px] text-white/40">
                No conversations yet — message a freelancer or client to start one.
              </p>
            )}
            {conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className={`flex w-full items-center gap-3 border-b border-white/5 p-4 text-left transition-colors ${
                  activeId === c.id ? "bg-brand/10" : "hover:bg-white/[0.03]"
                }`}
              >
                <Avatar name={c.with.name} avatarUrl={c.with.avatarUrl} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-[13.5px] font-semibold">{c.with.name}</span>
                    {c.lastMessage && <span className="shrink-0 text-[10.5px] text-white/35">{timeAgo(c.lastMessage.createdAt)}</span>}
                  </span>
                  <span className="mt-0.5 flex items-center justify-between gap-2">
                    <span className="truncate text-[12px] text-white/45">
                      {c.lastMessage ? `${c.lastMessage.senderId === myId ? "You: " : ""}${c.lastMessage.text}` : "No messages yet"}
                    </span>
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
          {active ? (
            <>
              <div className="flex items-center gap-3 border-b border-white/8 p-4">
                <Avatar name={active.with.name} avatarUrl={active.with.avatarUrl} size="h-10 w-10" />
                <div>
                  <p className="text-[14px] font-semibold">{active.with.name}</p>
                </div>
                <button
                  onClick={() => setShowDetails(true)}
                  aria-label="Show details"
                  className="ml-auto rounded-lg p-2 text-white/40 transition-colors hover:bg-white/5 hover:text-white xl:hidden"
                >
                  <Info className="h-4.5 w-4.5" />
                </button>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-5">
                {thread.map((m) => (
                  <div key={m.id} className={`flex animate-feed-in ${m.senderId === myId ? "justify-end" : "justify-start"}`}>
                    <div
                      className={
                        m.senderId === myId
                          ? "max-w-[75%] rounded-2xl rounded-br-md bg-gradient-to-r from-brand to-brand-soft px-4 py-2.5 text-[13.5px] leading-relaxed shadow-[0_0_20px_rgba(0,211,149,0.25)]"
                          : "max-w-[75%] rounded-2xl rounded-bl-md border border-white/8 bg-white/[0.05] px-4 py-2.5 text-[13.5px] leading-relaxed text-white/85"
                      }
                    >
                      {m.text}
                      <span className={`mt-1 block text-[10px] ${m.senderId === myId ? "text-ink/60" : "text-white/30"}`}>
                        {formatClock(m.createdAt)}
                      </span>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              {leakageWarning && (
                <p className="mx-3.5 mb-2 flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-[11.5px] font-medium text-amber-400">
                  <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                  Таны зурвас {leakageWarning.join(", ")} агуулж байж болзошгүй. Гэрээ байгуулагдахаас өмнө холбоо барих мэдээлэл солилцохгүй байхыг зөвлөж байна.
                </p>
              )}
              <div className="flex items-center gap-2 border-t border-white/8 p-3.5">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  placeholder="Write a message…"
                  className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-[13.5px] outline-none transition-colors placeholder:text-white/30 focus:border-brand/50"
                />
                <button
                  onClick={send}
                  disabled={sending || !draft.trim()}
                  aria-label="Send message"
                  className="rounded-xl bg-brand p-2.5 glow-brand transition-shadow hover:shadow-[0_0_30px_rgba(0,211,149,0.6)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Send className="h-4.5 w-4.5" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-8 text-center text-[13px] text-white/40">
              Select a conversation, or message someone from Find Talent to start one.
            </div>
          )}
        </div>

        {/* Details — persistent 3rd column on xl+, slide-over below that */}
        {active && (
          <div className="hidden border-l border-white/8 xl:block">
            <DetailsPanel contact={active.with} />
          </div>
        )}
      </div>

      {showDetails && active && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm xl:hidden" onClick={() => setShowDetails(false)} />
          <div className="fixed inset-y-0 right-0 z-50 w-[300px] max-w-[85vw] animate-feed-in border-l border-white/10 bg-[#0d1411] xl:hidden">
            <div className="flex items-center justify-between border-b border-white/8 p-4">
              <p className="text-[13px] font-bold">Details</p>
              <button onClick={() => setShowDetails(false)} aria-label="Close details" className="rounded-lg p-1.5 text-white/50 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <DetailsPanel contact={active.with} />
          </div>
        </>
      )}
    </div>
  );
}
