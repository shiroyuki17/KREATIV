import { useEffect, useRef, useState } from "react";
import { Search, Send, Info, X, AlertCircle, ShieldAlert, Phone, Video, MoreHorizontal, Smile, Paperclip, Check, CheckCheck, FileText, FileArchive, Figma, Github, Download, Loader2 } from "lucide-react";
import { useNav } from "../../nav.jsx";
import { getAccessToken, avatarSrc, API_BASE } from "../../lib/authApi.js";
import { fetchConversations, startConversation, fetchThread, sendMessage, sendFile } from "../../lib/messagesApi.js";
import { connectSocket, getSocket } from "../../lib/socket.js";
import { useEscapeKey } from "../../hooks/useEscapeKey.js";
import { useCall } from "../../lib/useCall.js";
import CallOverlay from "../chat/CallOverlay.jsx";

function fileSrc(fileUrl) {
  return fileUrl.startsWith("http") ? fileUrl : `${API_BASE}${fileUrl}`;
}

function formatFileSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// FR-2.3 (light version, no API): Figma/GitHub линкийг таньж, урьдчилан
// харах карт болгож харуулна — жинхэнэ Figma/GitHub API дуудахгүй, зөвхөн
// URL хэлбэрээр таньж дизайны хувьд онцолно.
const LINK_PATTERNS = [
  { re: /https?:\/\/(?:www\.)?figma\.com\/\S+/i, Icon: Figma, label: "Figma file", cls: "border-violet/30 bg-violet/10 text-violet-soft" },
  { re: /https?:\/\/(?:www\.)?github\.com\/\S+/i, Icon: Github, label: "GitHub link", cls: "border-white/20 bg-white/[0.05] text-white/80" },
];

function LinkPreview({ url, match }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`mt-1.5 flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-[12px] font-medium transition-opacity hover:opacity-80 ${match.cls}`}
    >
      <match.Icon className="h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{match.label}</span>
    </a>
  );
}

function FileBubble({ m }) {
  const isImage = m.fileType?.startsWith("image/");
  if (isImage) {
    return (
      <a href={fileSrc(m.fileUrl)} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-2xl">
        <img src={fileSrc(m.fileUrl)} alt={m.fileName || "attachment"} className="max-h-64 w-auto max-w-full object-cover" />
      </a>
    );
  }
  const Icon = m.fileType === "application/pdf" ? FileText : FileArchive;
  return (
    <a
      href={fileSrc(m.fileUrl)}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 transition-colors hover:border-white/25"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white/70">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-semibold text-white/85">{m.fileName}</span>
        <span className="block text-[10.5px] text-white/40">{formatFileSize(m.fileSize)}</span>
      </span>
      <Download className="h-3.5 w-3.5 shrink-0 text-white/40" />
    </a>
  );
}

function MessageContent({ m }) {
  if (m.fileUrl) return <FileBubble m={m} />;
  const match = LINK_PATTERNS.find((p) => p.re.test(m.text));
  const url = match?.re.exec(m.text)?.[0];
  return (
    <>
      {m.text}
      {match && url && <LinkPreview url={url} match={match} />}
    </>
  );
}

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

function Avatar({ name, avatarUrl, size = "md", online = false }) {
  const src = avatarSrc(avatarUrl);
  const sizes = { sm: "h-8 w-8 text-[10px]", md: "h-11 w-11 text-[12px]", lg: "h-14 w-14 text-[15px]" };
  return (
    <span className="relative shrink-0">
      <span className={`flex ${sizes[size] || sizes.md} items-center justify-center overflow-hidden rounded-full font-bold`}
        style={{ background: "linear-gradient(135deg, rgba(123, 57, 252, 0.4), rgba(100,200,255,0.3))", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)" }}>
        {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : initialsOf(name)}
      </span>
      {online && (
        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#1b1d20]"
          style={{ background: "#7B39FC" }} />
      )}
    </span>
  );
}

function DetailsPanel({ contact, onVoiceCall, onVideoCall }) {
  const skills = ["UI/UX Design", "React", "Figma", "Branding"];
  return (
    <div className="h-full overflow-y-auto">
      {/* Profile Header */}
      <div className="flex flex-col items-center px-5 py-8" style={{ background: "linear-gradient(180deg, rgba(123, 57, 252, 0.06) 0%, transparent 100%)" }}>
        <Avatar name={contact.name} avatarUrl={contact.avatarUrl} size="lg" online />
        <p className="mt-3 text-[15px] font-bold tracking-tight">{contact.name}</p>
        <span className="mt-1 flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium"
          style={{ background: "rgba(123, 57, 252, 0.1)", color: "#7B39FC" }}>
          <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
          Online
        </span>
        <p className="mt-2 text-[12px] text-white/40">Freelancer · Top Rated</p>
      </div>

      {/* Divider */}
      <div className="h-px mx-5" style={{ background: "rgba(255,255,255,0.06)" }} />

      {/* Skills */}
      <div className="p-5">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-white/30">Skills</p>
        <div className="flex flex-wrap gap-1.5">
          {skills.map((s) => (
            <span key={s} className="rounded-lg px-2.5 py-1 text-[11px] font-medium"
              style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.7)" }}>
              {s}
            </span>
          ))}
        </div>
      </div>

      <div className="h-px mx-5" style={{ background: "rgba(255,255,255,0.06)" }} />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 p-5">
        {[["98%", "Success"], ["142", "Projects"], ["4.9★", "Rating"], ["<1h", "Response"]].map(([val, lbl]) => (
          <div key={lbl} className="rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-[15px] font-bold" style={{ color: "#7B39FC" }}>{val}</p>
            <p className="text-[10.5px] text-white/40">{lbl}</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="space-y-2 p-5 pt-0">
        <button
          onClick={onVoiceCall}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[13px] font-semibold transition-all hover:brightness-110"
          style={{ background: "rgba(123, 57, 252, 0.15)", color: "#7B39FC", border: "1px solid rgba(123, 57, 252, 0.25)" }}>
          <Phone className="h-4 w-4" /> Voice Call
        </button>
        <button
          onClick={onVideoCall}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[13px] font-medium transition-all hover:bg-white/10"
          style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <Video className="h-4 w-4" /> Video Call
        </button>
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
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const activeIdRef = useRef(null);
  activeIdRef.current = activeId;

  const active = conversations.find((c) => c.id === activeId) || null;
  const filteredConvos = conversations.filter((c) =>
    c.with.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEscapeKey(() => setShowDetails(false), showDetails);

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

  // FR-2.2: connectSocket() дээрх useEffect-ийн ДАРАА дуудагдах ёстой —
  // useCall дотор нь socket listener бүртгэдэг useEffect байгаа тул,
  // өмнө нь байрлавал getSocket() socket холбогдохоос өмнө null буцааж,
  // дуудлагын listener-үүд огт бүртгэгдэхгүй байх эрсдэлтэй.
  // Дуудлагын нөгөө талыг харуулахдаа идэвхтэй харилцан яриа эсвэл (орж
  // ирж буй дуудлагын хувьд) fromUserId-аар conversations жагсаалтаас хайна.
  const call = useCall(myId);
  const callOtherUser = call.incomingCall
    ? (() => {
        const c = conversations.find((c) => c.with.id === call.incomingCall.fromUserId);
        return c ? { name: c.with.name, avatarUrl: avatarSrc(c.with.avatarUrl) } : { name: "Someone", avatarUrl: null };
      })()
    : active
      ? { name: active.with.name, avatarUrl: avatarSrc(active.with.avatarUrl) }
      : null;

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

  // Socket холбогдсон үед `message:new` нь жагсаалт болон нээлттэй яриаг
  // хоёуланг нь шинэчилдэг тул давхар polling шаардлагагүй. Өмнө нь эдгээр
  // нь 8с/4с тутам болзолгүй ажилладаг байсан — нэг минутад ~20 нэмэлт
  // хүсэлт. Одоо зөвхөн socket тасарсан үед л нөөц зам болж ажиллана.
  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    const t = setInterval(() => {
      if (getSocket()?.connected) return;
      fetchConversations(token).then((res) => setConversations(res.conversations)).catch(() => {});
    }, 8000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const token = getAccessToken();
    if (!token || !activeId) { setThread([]); return; }
    let cancelled = false;
    const load = () => fetchThread(activeId, token).then((res) => { if (!cancelled) setThread(res.messages); }).catch(() => {});
    load(); // яриа солигдоход эхний ачаалалт үргэлж хэрэгтэй
    const t = setInterval(() => { if (!getSocket()?.connected) load(); }, 4000);
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
    inputRef.current?.focus();
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

  const handleFilePick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // same file re-picked twice still fires onChange
    if (!file || !activeId) return;
    setUploadingFile(true);
    setError("");
    try {
      const message = await sendFile(activeId, file, getAccessToken());
      setThread((t) => [...t, message]);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingFile(false);
    }
  };

  // Group messages by date
  function groupByDate(msgs) {
    const groups = [];
    let lastDate = null;
    for (const m of msgs) {
      const d = new Date(m.createdAt).toLocaleDateString([], { month: "short", day: "numeric" });
      if (d !== lastDate) { groups.push({ type: "date", label: d }); lastDate = d; }
      groups.push({ type: "msg", data: m });
    }
    return groups;
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-8">
        <div className="flex items-center gap-3 mb-7">
          <h1 className="font-display text-3xl font-bold tracking-tight">Messages</h1>
        </div>
        <div className="flex h-[560px] items-center justify-center rounded-2xl text-[13px] text-white/40"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "rgba(123, 57, 252, 0.5)", borderTopColor: "transparent" }} />
            <span>Loading conversations…</span>
          </div>
        </div>
      </div>
    );
  }

  const grouped = groupByDate(thread);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-8">
      <CallOverlay call={call} otherUser={callOtherUser} />
      {/* Page Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Messages</h1>
          <p className="mt-1 text-[13px] text-white/40">
            {conversations.length} conversation{conversations.length !== 1 ? "s" : ""}
          </p>
        </div>
        {error && (
          <p className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[12px] font-medium text-red-400"
            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
          </p>
        )}
      </div>

      {/* Main Layout */}
      <div className="flex overflow-hidden rounded-2xl"
        style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.07)",
          height: "calc(100vh - 220px)",
          minHeight: "520px",
          maxHeight: "760px",
          backdropFilter: "blur(20px)",
        }}>

        {/* ── Sidebar ── */}
        <div className="flex w-[300px] shrink-0 flex-col" style={{ borderRight: "1px solid rgba(255,255,255,0.06)" }}>
          {/* Sidebar Header */}
          <div className="p-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-2.5 rounded-xl px-3 py-2.5"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <Search className="h-3.5 w-3.5 shrink-0 text-white/35" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations…"
                className="w-full bg-transparent text-[13px] outline-none placeholder:text-white/30"
              />
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto">
            {filteredConvos.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl"
                  style={{ background: "rgba(123, 57, 252, 0.08)" }}>
                  <Search className="h-5 w-5" style={{ color: "rgba(123, 57, 252, 0.5)" }} />
                </div>
                <p className="text-[12.5px] text-white/40">
                  {searchQuery ? "No results found" : "No conversations yet — message a freelancer or client to start one."}
                </p>
              </div>
            )}
            {filteredConvos.map((c) => {
              const isActive = activeId === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveId(c.id)}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-all"
                  style={{
                    background: isActive ? "rgba(123, 57, 252, 0.08)" : "transparent",
                    borderLeft: isActive ? "2px solid #7B39FC" : "2px solid transparent",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                  }}
                >
                  <Avatar name={c.with.name} avatarUrl={c.with.avatarUrl} online={Math.random() > 0.5} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-[13.5px] font-semibold">{c.with.name}</span>
                      {c.lastMessage && (
                        <span className="shrink-0 text-[10.5px] text-white/30">{timeAgo(c.lastMessage.createdAt)}</span>
                      )}
                    </span>
                    <span className="mt-0.5 flex items-center justify-between gap-2">
                      <span className="truncate text-[12px] text-white/40">
                        {c.lastMessage
                          ? `${c.lastMessage.senderId === myId ? "You: " : ""}${c.lastMessage.text}`
                          : "No messages yet"}
                      </span>
                      {c.unread > 0 && (
                        <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[9.5px] font-bold text-black"
                          style={{ background: "#7B39FC", boxShadow: "0 0 10px rgba(123, 57, 252, 0.5)" }}>
                          {c.unread}
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Thread Area ── */}
        <div className="flex min-w-0 flex-1 flex-col">
          {active ? (
            <>
              {/* Chat Header */}
              <div className="flex items-center gap-3 px-5 py-3.5 shrink-0"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.01)" }}>
                <Avatar name={active.with.name} avatarUrl={active.with.avatarUrl} size="sm" online />
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-bold truncate">{active.with.name}</p>
                  <p className="text-[11px]" style={{ color: "#7B39FC" }}>● Online</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => call.startCall(active.with.id, activeId, false)}
                    aria-label="Voice call"
                    className="rounded-xl p-2 text-white/40 transition-colors hover:bg-white/5 hover:text-white"
                  >
                    <Phone className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => call.startCall(active.with.id, activeId, true)}
                    aria-label="Video call"
                    className="rounded-xl p-2 text-white/40 transition-colors hover:bg-white/5 hover:text-white"
                  >
                    <Video className="h-4 w-4" />
                  </button>
                  <button className="rounded-xl p-2 text-white/40 transition-colors hover:bg-white/5 hover:text-white">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setShowDetails((v) => !v)}
                    aria-label="Show details"
                    className="rounded-xl p-2 text-white/40 transition-colors hover:bg-white/5 hover:text-white xl:hidden"
                  >
                    <Info className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 space-y-1 overflow-y-auto px-5 py-4"
                style={{ background: "radial-gradient(ellipse at 30% 20%, rgba(123, 57, 252, 0.03) 0%, transparent 60%)" }}>
                {grouped.map((item, i) => {
                  if (item.type === "date") {
                    return (
                      <div key={`date-${i}`} className="flex items-center gap-3 py-3">
                        <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
                        <span className="text-[10.5px] text-white/30 font-medium px-2">{item.label}</span>
                        <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
                      </div>
                    );
                  }
                  const m = item.data;
                  const isMe = m.senderId === myId;
                  return (
                    <div key={m.id} className={`flex items-end gap-2 ${isMe ? "justify-end" : "justify-start"} animate-feed-in`}>
                      {!isMe && <Avatar name={active.with.name} avatarUrl={active.with.avatarUrl} size="sm" />}
                      <div className="flex flex-col gap-1" style={{ maxWidth: "68%" }}>
                        <div
                          className={
                            m.fileType?.startsWith("image/")
                              ? ""
                              : `px-4 py-2.5 text-[13.5px] leading-relaxed ${isMe ? "rounded-2xl rounded-br-sm" : "rounded-2xl rounded-bl-sm"}`
                          }
                          style={
                            m.fileType?.startsWith("image/")
                              ? undefined
                              : isMe ? {
                                background: "linear-gradient(135deg, #7B39FC 0%, #00b87d 100%)",
                                color: "#0a1a12",
                                boxShadow: "0 4px 20px rgba(123, 57, 252, 0.25)",
                                fontWeight: 500,
                              } : {
                                background: "rgba(255,255,255,0.07)",
                                border: "1px solid rgba(255,255,255,0.08)",
                                color: "rgba(255,255,255,0.88)",
                              }
                          }
                        >
                          <MessageContent m={m} />
                        </div>
                        <span className={`flex items-center gap-1 text-[10px] text-white/25 ${isMe ? "justify-end" : "justify-start"}`}>
                          {formatClock(m.createdAt)}
                          {isMe && <CheckCheck className="h-3 w-3 text-white/30" />}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {/* Leakage Warning */}
              {leakageWarning && (
                <div className="mx-4 mb-2 flex items-start gap-2 rounded-xl px-3.5 py-2.5 text-[11.5px] font-medium"
                  style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", color: "#fbbf24" }}>
                  <ShieldAlert className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>Таны зурвас {leakageWarning.join(", ")} агуулж байж болзошгүй. Гэрээ байгуулагдахаас өмнө холбоо барих мэдээлэл солилцохгүй байхыг зөвлөж байна.</span>
                </div>
              )}

              {/* Input Bar */}
              <div className="flex items-center gap-3 px-4 py-3.5 shrink-0"
                style={{ borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.01)" }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/gif,application/pdf,.zip"
                  onChange={handleFilePick}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFile}
                  aria-label="Attach file"
                  className="shrink-0 rounded-xl p-2 text-white/30 transition hover:text-white/60 disabled:opacity-50"
                >
                  {uploadingFile ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <Paperclip className="h-4.5 w-4.5" />}
                </button>
                <div className="flex flex-1 items-center gap-2 rounded-2xl px-4 py-2"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)", transition: "border-color 0.2s" }}
                  onFocus={(e) => e.currentTarget.style.borderColor = "rgba(123, 57, 252, 0.4)"}
                  onBlur={(e) => e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)"}
                >
                  <input
                    ref={inputRef}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
                    placeholder="Write a message…"
                    className="flex-1 bg-transparent text-[13.5px] outline-none placeholder:text-white/25"
                  />
                  <button className="shrink-0 text-white/30 transition hover:text-white/60">
                    <Smile className="h-4 w-4" />
                  </button>
                </div>
                <button
                  onClick={send}
                  disabled={sending || !draft.trim()}
                  aria-label="Send message"
                  className="shrink-0 rounded-xl p-2.5 transition-all disabled:cursor-not-allowed disabled:opacity-40 hover:scale-105 active:scale-95"
                  style={{
                    background: draft.trim() ? "linear-gradient(135deg, #7B39FC, #00b87d)" : "rgba(255,255,255,0.06)",
                    color: draft.trim() ? "#0a1a12" : "rgba(255,255,255,0.3)",
                    boxShadow: draft.trim() ? "0 4px 16px rgba(123, 57, 252, 0.35)" : "none",
                  }}
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </>
          ) : (
            /* Empty state */
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl"
                style={{ background: "rgba(123, 57, 252, 0.08)", border: "1px solid rgba(123, 57, 252, 0.15)" }}>
                <Send className="h-7 w-7" style={{ color: "rgba(123, 57, 252, 0.5)" }} />
              </div>
              <div>
                <p className="text-[15px] font-semibold text-white/70">No conversation selected</p>
                <p className="mt-1 text-[13px] text-white/35">
                  Pick a chat from the sidebar or message someone from Find Talent
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Details Panel — persistent 3rd column on xl+ ── */}
        {active && (
          <div className="hidden xl:block w-[260px] shrink-0" style={{ borderLeft: "1px solid rgba(255,255,255,0.06)" }}>
            <DetailsPanel
              contact={active.with}
              onVoiceCall={() => call.startCall(active.with.id, activeId, false)}
              onVideoCall={() => call.startCall(active.with.id, activeId, true)}
            />
          </div>
        )}
      </div>

      {/* Details slide-over (mobile/tablet) */}
      {showDetails && active && (
        <>
          <div
            className="fixed inset-0 z-40 xl:hidden"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
            onClick={() => setShowDetails(false)}
          />
          <div
            className="fixed inset-y-0 right-0 z-50 w-[300px] max-w-[85vw] xl:hidden animate-feed-in overflow-hidden"
            style={{ background: "#1b1d20", borderLeft: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-[13px] font-bold">Contact Info</p>
              <button
                onClick={() => setShowDetails(false)}
                aria-label="Close details"
                className="rounded-xl p-1.5 text-white/40 transition hover:bg-white/5 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <DetailsPanel
              contact={active.with}
              onVoiceCall={() => call.startCall(active.with.id, activeId, false)}
              onVideoCall={() => call.startCall(active.with.id, activeId, true)}
            />
          </div>
        </>
      )}
    </div>
  );
}
