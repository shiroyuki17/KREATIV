import { useEffect, useRef, useState } from "react";
import { Search, Send, Info, X, AlertCircle, ShieldAlert, Phone, Video, MoreHorizontal, Smile, Paperclip, Check, CheckCheck, FileText, FileArchive, Figma, Github, Download, Loader2, Ban, Image as ImageIcon } from "lucide-react";
import { useNav } from "../../nav.jsx";
import { useI18n, useT } from "../../i18n.jsx";
import { clockTime, shortDate } from "../../lib/dates.js";
import { getAccessToken, avatarSrc, API_BASE } from "../../lib/authApi.js";
import { fetchConversations, startConversation, fetchThread, sendMessage, sendFile, blockUser, unblockUser, searchPeople } from "../../lib/messagesApi.js";
import { fetchFreelancerByUserId } from "../../lib/talentApi.js";
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

// Emoji сонгогчийн жагсаалт — гуравдагч сан татахгүй (bundle-д 100KB+
// нэмэхээс аврах), ажлын чатад бодитоор хэрэглэгддэг 21-ийг гараар сонгов.
const QUICK_EMOJI = [
  "👍", "🙏", "🔥", "✅", "🎉", "👀", "💜",
  "😀", "😅", "🤔", "😍", "😭", "🙌", "🤝",
  "💡", "⚡", "📎", "⏰", "❤️", "😎", "🚀",
];

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

// t()-г ПАРАМЕТРЭЭР авна: энэ нь компонент биш ердийн функц тул дотор нь
// hook дуудвал React-ийн дүрэм зөрчигдөнө (нөхцөлт/давталтад дуудагдана).
function timeAgo(iso, t) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return t("msg.now");
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
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
        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#1b1730]"
          style={{ background: "var(--color-brand)" }} />
      )}
    </span>
  );
}

function DetailsPanel({ contact, messages = [], onVoiceCall, onVideoCall, onViewProfile }) {
  const t = useT();
  // Энэ ярианд солилцсон БОДИТ файлууд — Message мөрүүдээс шүүнэ, тусад нь
  // хүсэлт явуулах шаардлагагүй (thread аль хэдийн ачаалагдсан).
  const attachments = messages.filter((m) => m.fileUrl);
  // FR-2.1: skills/stats нь өмнө нь бүх хэн нэгэнд ижилхэн "98% Success /
  // 142 Projects" гэсэн ХАРДКОД байсан — одоо тухайн хэрэглэгчийн бодит
  // freelancer профайлаас татна. Client-той чатлаж байгаа бол (freelancer
  // профайлгүй тул 404) энэ хэсгийг зүгээр л алгасна.
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setProfile(null);
    setProfileLoading(true);
    fetchFreelancerByUserId(contact.id)
      .then((p) => { if (!cancelled) setProfile(p); })
      .catch(() => { if (!cancelled) setProfile(null); })
      .finally(() => { if (!cancelled) setProfileLoading(false); });
    return () => { cancelled = true; };
  }, [contact.id]);

  return (
    <div className="h-full overflow-y-auto">
      {/* Profile Header */}
      <div className="flex flex-col items-center px-5 py-8" style={{ background: "linear-gradient(180deg, rgba(123, 57, 252, 0.06) 0%, transparent 100%)" }}>
        <Avatar name={contact.name} avatarUrl={contact.avatarUrl} size="lg" online={contact.online} />
        <p className="mt-3 text-[15px] font-bold tracking-tight">{contact.name}</p>
        {contact.online ? (
          <span className="mt-1 flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium"
            style={{ background: "rgba(123, 57, 252, 0.1)", color: "var(--color-brand)" }}>
            <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
            {t("msg.online").replace("● ", "")}
          </span>
        ) : (
          <span className="mt-1 text-[11px] text-white/35">{t("msg.offline")}</span>
        )}
        {profile?.headline && <p className="mt-2 text-[12px] text-white/45">{profile.headline}</p>}
        <button
          onClick={onViewProfile}
          className="mt-3 rounded-lg border border-white/12 bg-white/[0.04] px-3.5 py-1.5 text-[11.5px] font-semibold text-white/70 transition-colors hover:border-white/25 hover:text-white"
        >
          {t("common.viewProfile")}
        </button>
      </div>

      <div className="h-px mx-5" style={{ background: "rgba(255,255,255,0.06)" }} />

      {profileLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-4 w-4 animate-spin text-white/30" />
        </div>
      ) : profile ? (
        <>
          {profile.skills?.length > 0 && (
            <div className="p-5">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-white/30">{t("msg.skills")}</p>
              <div className="flex flex-wrap gap-1.5">
                {profile.skills.map((s) => (
                  <span key={s} className="rounded-lg px-2.5 py-1 text-[11px] font-medium"
                    style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.7)" }}>
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="h-px mx-5" style={{ background: "rgba(255,255,255,0.06)" }} />

          {/* Зөвхөн бодитоор хадгалдаг тоог харуулна — "Success %"/"Response
              time" гэх мэт бидний схемд огт байхгүй хэмжигдэхүүнийг зохиохгүй. */}
          <div className="grid grid-cols-2 gap-3 p-5">
            <div className="rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-[15px] font-bold" style={{ color: "var(--color-brand)" }}>
                {profile.ratingAvg > 0 ? `${profile.ratingAvg.toFixed(1)}★` : "—"}
              </p>
              <p className="text-[10.5px] text-white/40">{t("msg.rating")}</p>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-[15px] font-bold" style={{ color: "var(--color-brand)" }}>{profile.jobsCompleted}</p>
              <p className="text-[10.5px] text-white/40">{t("msg.jobsDone")}</p>
            </div>
          </div>

          <div className="h-px mx-5" style={{ background: "rgba(255,255,255,0.06)" }} />
        </>
      ) : null}

      {/* Энэ ярианд илгээсэн файлууд. Чат дотор нь дээш гүйлгэж хайхын
          оронд нэг дор жагсаана — бүгд бодит Message мөрөөс гаралтай. */}
      {attachments.length > 0 && (
        <>
          <div className="p-5">
            <p className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-white/30">
              {t("msg.attachments")}
              <span className="rounded-full bg-white/8 px-1.5 py-0.5 text-[10px] text-white/50">{attachments.length}</span>
            </p>
            <div className="space-y-1.5">
              {attachments.map((m) => (
                <a
                  key={m.id}
                  href={fileSrc(m.fileUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 rounded-lg border border-white/8 bg-white/[0.03] px-2.5 py-2 transition-colors hover:border-white/20"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/8 text-white/60">
                    {m.fileType?.startsWith("image/")
                      ? <ImageIcon className="h-3.5 w-3.5" />
                      : m.fileType === "application/pdf"
                      ? <FileText className="h-3.5 w-3.5" />
                      : <FileArchive className="h-3.5 w-3.5" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11.5px] font-medium text-white/80">{m.fileName}</span>
                    <span className="block text-[10px] text-white/35">{formatFileSize(m.fileSize)}</span>
                  </span>
                  <Download className="h-3.5 w-3.5 shrink-0 text-white/30" />
                </a>
              ))}
            </div>
          </div>
          <div className="h-px mx-5" style={{ background: "rgba(255,255,255,0.06)" }} />
        </>
      )}

      {/* Actions */}
      <div className="space-y-2 p-5">
        <button
          onClick={onVoiceCall}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[13px] font-semibold transition-all hover:brightness-110"
          style={{ background: "rgba(123, 57, 252, 0.15)", color: "var(--color-brand)", border: "1px solid rgba(123, 57, 252, 0.25)" }}>
          <Phone className="h-4 w-4" /> {t("msg.voiceCall")}
        </button>
        <button
          onClick={onVideoCall}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[13px] font-medium transition-all hover:bg-white/10"
          style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <Video className="h-4 w-4" /> {t("msg.videoCall")}
        </button>
      </div>
    </div>
  );
}

export default function Messages() {
  const { t, locale } = useI18n();
  const { params, user, nav } = useNav();
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
  const [peerTyping, setPeerTyping] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [blockBusy, setBlockBusy] = useState(false);
  const [people, setPeople] = useState([]);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const emojiRef = useRef(null);
  const menuRef = useRef(null);
  const typingStopTimer = useRef(null);
  const typingSentAt = useRef(0);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const activeIdRef = useRef(null);
  activeIdRef.current = activeId;
  const conversationsRef = useRef([]);
  conversationsRef.current = conversations;

  const active = conversations.find((c) => c.id === activeId) || null;
  const filteredConvos = conversations.filter((c) =>
    c.with.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEscapeKey(() => setShowDetails(false), showDetails);
  useEscapeKey(() => setMenuOpen(false), menuOpen);

  // Цэсний гадна дарахад хаах
  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  useEscapeKey(() => setEmojiOpen(false), emojiOpen);
  useEffect(() => {
    if (!emojiOpen) return;
    const onClick = (e) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target)) setEmojiOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [emojiOpen]);

  // Хайлт бичихэд платформ дээрх хүмүүсийг хайж, шинэ чат эхлүүлэх
  // боломж санал болгоно (өмнө нь зөвхөн одоо байгаа яриа шүүгддэг байв).
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) { setPeople([]); return; }
    setPeopleLoading(true);
    const t = setTimeout(() => {
      searchPeople(q)
        .then((res) => setPeople(res.people || []))
        .catch(() => setPeople([]))
        .finally(() => setPeopleLoading(false));
    }, 300);
    return () => { clearTimeout(t); setPeopleLoading(false); };
  }, [searchQuery]);

  // Хайлтаас олдсон хүнтэй чат нээх (эсвэл аль хэдийн байгаа руу үсрэх).
  async function openChatWith(userId) {
    try {
      const convo = await startConversation(userId);
      const res = await fetchConversations();
      setConversations(res.conversations);
      setActiveId(convo.id);
      setSearchQuery("");
    } catch (err) {
      setError(err.message);
    }
  }

  // Ярианы жагсаалтыг дахин татахгүйгээр тухайн хүний блок төлөвийг шинэчилнэ.
  async function toggleBlock() {
    if (!active || blockBusy) return;
    const peerId = active.with.id;
    const nowBlocked = !active.with.blockedByMe;
    setBlockBusy(true);
    setError("");
    try {
      if (nowBlocked) await blockUser(peerId);
      else await unblockUser(peerId);
      setConversations((list) =>
        list.map((c) =>
          c.with.id === peerId
            ? { ...c, with: { ...c.with, blockedByMe: nowBlocked, online: nowBlocked ? false : c.with.online } }
            : c
        )
      );
      setMenuOpen(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBlockBusy(false);
    }
  }

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

    // FR-2.1: онлайн төлөв — өмнө нь Math.random()-оор зохиомол харуулдаг
    // байсныг socket.js-ийн бодит presence:online/offline event-үүдээр
    // солив (server нь зөвхөн ярилцлагатай хамтрагчид рүү л явуулдаг).
    const onOnline = ({ userId }) =>
      setConversations((cs) => cs.map((c) => (c.with.id === userId ? { ...c, with: { ...c.with, online: true } } : c)));
    const onOffline = ({ userId }) =>
      setConversations((cs) => cs.map((c) => (c.with.id === userId ? { ...c, with: { ...c.with, online: false } } : c)));
    socket.on("presence:online", onOnline);
    socket.on("presence:offline", onOffline);

    // FR-2.1: "бичиж байна…" заалт — зөвхөн идэвхтэй нээлттэй ярилцлагад л
    // харуулна, persist хийхгүй (чат түүхэнд орохгүй).
    const onTypingStart = ({ conversationId, fromUserId }) => {
      const c = conversationsRef.current.find((c) => c.id === activeIdRef.current);
      if (conversationId === activeIdRef.current && c?.with.id === fromUserId) setPeerTyping(true);
    };
    const onTypingStop = ({ conversationId }) => {
      if (conversationId === activeIdRef.current) setPeerTyping(false);
    };
    socket.on("typing:start", onTypingStart);
    socket.on("typing:stop", onTypingStop);

    return () => {
      socket.off("message:new", onMessage);
      socket.off("presence:online", onOnline);
      socket.off("presence:offline", onOffline);
      socket.off("typing:start", onTypingStart);
      socket.off("typing:stop", onTypingStop);
    };
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
        return c ? { name: c.with.name, avatarUrl: avatarSrc(c.with.avatarUrl) } : { name: t("msg.someone"), avatarUrl: null };
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
    setPeerTyping(false); // яриа солигдоход өмнөх ярилцлагын "бичиж байна" төлөв хадгалагдахгүй
    if (!token || !activeId) { setThread([]); return; }
    let cancelled = false;
    const load = () => fetchThread(activeId, token).then((res) => { if (!cancelled) setThread(res.messages); }).catch(() => {});
    load(); // яриа солигдоход эхний ачаалалт үргэлж хэрэгтэй
    const t = setInterval(() => { if (!getSocket()?.connected) load(); }, 4000);
    return () => { cancelled = true; clearInterval(t); };
  }, [activeId]);

  // FR-2.1: draft бичих үед хамтрагчид "бичиж байна" мэдэгдэл явуулна —
  // 2.5с чимээгүй бол эсвэл илгээмэгц шууд stop илгээнэ. Хэт олон event
  // явуулахгүйн тулд 1.5с-д нэгээс илүүгүй start явуулна.
  const notifyTyping = () => {
    if (!active) return;
    const socket = getSocket();
    if (!socket) return;
    const now = Date.now();
    if (now - typingSentAt.current > 1500) {
      socket.emit("typing:start", { toUserId: active.with.id, conversationId: active.id });
      typingSentAt.current = now;
    }
    clearTimeout(typingStopTimer.current);
    typingStopTimer.current = setTimeout(() => {
      socket.emit("typing:stop", { toUserId: active.with.id, conversationId: active.id });
      typingSentAt.current = 0;
    }, 2500);
  };

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
    clearTimeout(typingStopTimer.current);
    typingSentAt.current = 0;
    getSocket()?.emit("typing:stop", { toUserId: active.with.id, conversationId: active.id });
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
      const d = shortDate(m.createdAt, locale);
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
            <span>{t("msg.loadingConvos")}</span>
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
                placeholder={t("msg.searchConvos")}
                className="w-full bg-transparent text-[13px] outline-none placeholder:text-white/30"
              />
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto">
            {filteredConvos.length === 0 && !searchQuery && (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl"
                  style={{ background: "rgba(123, 57, 252, 0.08)" }}>
                  <Search className="h-5 w-5" style={{ color: "rgba(123, 57, 252, 0.5)" }} />
                </div>
                <p className="text-[12.5px] text-white/40">
                  {t("msg.noConvos")}
                </p>
              </div>
            )}

            {/* Хайлтаар олдсон хүмүүс — шинэ чат эхлүүлэх */}
            {searchQuery.trim().length >= 2 && (
              <div className="border-b border-white/6 pb-2">
                <p className="px-4 pb-1.5 pt-3 text-[10px] font-bold uppercase tracking-widest text-white/30">
                  {peopleLoading ? t("msg.searching") : people.length ? t("msg.startNewChat") : t("msg.noPeople")}
                </p>
                {people.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => openChatWith(p.id)}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left transition-colors hover:bg-white/5"
                  >
                    <Avatar name={p.name} avatarUrl={p.avatarUrl} size="sm" />
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-white/85">{p.name}</span>
                    <Send className="h-3.5 w-3.5 shrink-0 text-white/25" />
                  </button>
                ))}
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
                    borderLeft: isActive ? "2px solid var(--color-brand)" : "2px solid transparent",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                  }}
                >
                  <Avatar name={c.with.name} avatarUrl={c.with.avatarUrl} online={c.with.online} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-[13.5px] font-semibold">{c.with.name}</span>
                      {c.lastMessage && (
                        <span className="shrink-0 text-[10.5px] text-white/30">{timeAgo(c.lastMessage.createdAt, t)}</span>
                      )}
                    </span>
                    <span className="mt-0.5 flex items-center justify-between gap-2">
                      {/* Файл зурвасын text нь хоосон тул зүгээр л
                          хэвлэвэл мөр хоосон харагдана — файлын нэрийг нь
                          харуулна. */}
                      <span className="truncate text-[12px] text-white/40">
                        {c.lastMessage
                          ? `${c.lastMessage.senderId === myId ? "You: " : ""}${
                              c.lastMessage.text || (c.lastMessage.fileName ? `📎 ${c.lastMessage.fileName}` : `📎 ${t("msg.file")}`)
                            }`
                          : "No messages yet"}
                      </span>
                      {c.unread > 0 && (
                        <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[9.5px] font-bold text-white"
                          style={{ background: "var(--color-brand)", boxShadow: "0 0 10px rgba(123, 57, 252, 0.5)" }}>
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
                <Avatar name={active.with.name} avatarUrl={active.with.avatarUrl} size="sm" online={active.with.online} />
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-bold truncate">{active.with.name}</p>
                  <p className="text-[11px]" style={{ color: active.with.blockedByMe ? "rgba(248,113,113,0.8)" : (peerTyping || active.with.online) ? "var(--color-brand)" : "rgba(255,255,255,0.35)" }}>
                    {active.with.blockedByMe
                      ? t("msg.blocked")
                      : peerTyping ? t("msg.typing") : active.with.online ? t("msg.online") : t("msg.offline")}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => call.startCall(active.with.id, activeId, false)}
                    disabled={active.with.blockedByMe || active.with.hasBlockedMe}
                    aria-label={t("msg.voiceCall")}
                    className="rounded-xl p-2 text-white/40 transition-colors hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <Phone className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => call.startCall(active.with.id, activeId, true)}
                    disabled={active.with.blockedByMe || active.with.hasBlockedMe}
                    aria-label={t("msg.videoCall")}
                    className="rounded-xl p-2 text-white/40 transition-colors hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <Video className="h-4 w-4" />
                  </button>
                  <div ref={menuRef} className="relative">
                    <button
                      onClick={() => setMenuOpen((o) => !o)}
                      aria-label={t("msg.moreOptions")}
                      className="rounded-xl p-2 text-white/40 transition-colors hover:bg-white/5 hover:text-white"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                    {menuOpen && (
                      <div className="absolute right-0 top-[calc(100%+6px)] z-30 min-w-[190px] overflow-hidden rounded-xl border border-white/10 bg-[#1b1730] py-1.5 shadow-xl shadow-black/40">
                        <button
                          onClick={toggleBlock}
                          disabled={blockBusy}
                          className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
                        >
                          <Ban className="h-3.5 w-3.5 shrink-0" />
                          {blockBusy
                            ? t("msg.pleaseWait")
                            : active.with.blockedByMe
                            ? t("msg.unblock")
                            : t("msg.blockUser")}
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setShowDetails((v) => !v)}
                    aria-label={t("msg.showDetails")}
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
                                // Ягаан→ногоон градиент байсныг зассан: ногоон нь
                                // хуучин theme-ийн үлдэгдэл байсан бөгөөд шинэ
                                // ягаан брэндтэй зөрчилдөж, бараан ногоон текст нь
                                // уншихад ч хүнд байв.
                                background: "linear-gradient(135deg, var(--color-brand) 0%, #b06bfb 100%)",
                                color: "#ffffff",
                                boxShadow: "0 4px 20px rgba(123, 57, 252, 0.3)",
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
                          {clockTime(m.createdAt, locale)}
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
                  <span>{t("msg.leakageWarning", { items: leakageWarning.join(", ") })}</span>
                </div>
              )}

              {/* Блоклосон/блоклуулсан үед зурвас бичих талбарыг харуулахгүй —
                  бичээд илгээх гэж оролдоод сервер 403 өгснийг харах нь
                  утгагүй, шалтгааныг нь шууд хэлэх нь тодорхой. */}
              {(active.with.blockedByMe || active.with.hasBlockedMe) ? (
                <div className="flex flex-col items-center gap-2 px-5 py-5 text-center shrink-0"
                  style={{ borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.01)" }}>
                  <Ban className="h-5 w-5 text-white/25" />
                  <p className="text-[12.5px] text-white/45">
                    {active.with.blockedByMe
                      ? t("msg.youBlocked", { name: active.with.name })
                      : t("msg.cannotMessage")}
                  </p>
                  {active.with.blockedByMe && (
                    <button
                      onClick={toggleBlock}
                      disabled={blockBusy}
                      className="rounded-xl border border-white/12 bg-white/[0.04] px-4 py-2 text-[12.5px] font-semibold text-white/75 transition-colors hover:border-white/25 hover:text-white disabled:opacity-50"
                    >
                      {blockBusy ? t("msg.pleaseWait") : t("msg.unblock")}
                    </button>
                  )}
                </div>
              ) : (
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
                  aria-label={t("msg.attachFile")}
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
                    onChange={(e) => { setDraft(e.target.value); notifyTyping(); }}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
                    placeholder={t("msg.writePlaceholder")}
                    className="flex-1 bg-transparent text-[13.5px] outline-none placeholder:text-white/25"
                  />
                  {/* Өмнө нь onClick огт байхгүй, зүгээр л зурагтай товч
                      байв. Жижиг emoji сонгогч — гадуур дарахад хаагдана. */}
                  <div ref={emojiRef} className="relative shrink-0">
                    <button
                      onClick={() => setEmojiOpen((o) => !o)}
                      aria-label={t("msg.insertEmoji")}
                      className="text-white/30 transition hover:text-white/60"
                    >
                      <Smile className="h-4 w-4" />
                    </button>
                    {emojiOpen && (
                      <div className="absolute bottom-[calc(100%+10px)] right-0 z-30 grid w-[212px] grid-cols-7 gap-0.5 rounded-xl border border-white/10 bg-[#1b1730] p-2 shadow-xl shadow-black/40">
                        {QUICK_EMOJI.map((e) => (
                          <button
                            key={e}
                            onClick={() => {
                              setDraft((d) => d + e);
                              setEmojiOpen(false);
                              inputRef.current?.focus();
                            }}
                            className="rounded-lg py-1 text-[17px] leading-none transition-colors hover:bg-white/10"
                          >
                            {e}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={send}
                  disabled={sending || !draft.trim()}
                  aria-label={t("msg.send")}
                  className="shrink-0 rounded-xl p-2.5 transition-all disabled:cursor-not-allowed disabled:opacity-40 hover:scale-105 active:scale-95"
                  style={{
                    background: draft.trim() ? "linear-gradient(135deg, var(--color-brand), #b06bfb)" : "rgba(255,255,255,0.06)",
                    color: draft.trim() ? "#ffffff" : "rgba(255,255,255,0.3)",
                    boxShadow: draft.trim() ? "0 4px 16px rgba(123, 57, 252, 0.35)" : "none",
                  }}
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              )}
            </>
          ) : (
            /* Empty state */
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl"
                style={{ background: "rgba(123, 57, 252, 0.08)", border: "1px solid rgba(123, 57, 252, 0.15)" }}>
                <Send className="h-7 w-7" style={{ color: "rgba(123, 57, 252, 0.5)" }} />
              </div>
              <div>
                <p className="text-[15px] font-semibold text-white/70">{t("msg.noneSelected")}</p>
                <p className="mt-1 text-[13px] text-white/35">
                  {t("msg.pickAChat")}
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
              messages={thread}
              onVoiceCall={() => call.startCall(active.with.id, activeId, false)}
              onVideoCall={() => call.startCall(active.with.id, activeId, true)}
              onViewProfile={() => nav("profile", { userId: active.with.id })}
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
            style={{ background: "#1b1730", borderLeft: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-[13px] font-bold">{t("msg.contactInfo")}</p>
              <button
                onClick={() => setShowDetails(false)}
                aria-label={t("msg.closeDetails")}
                className="rounded-xl p-1.5 text-white/40 transition hover:bg-white/5 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <DetailsPanel
              contact={active.with}
              messages={thread}
              onVoiceCall={() => call.startCall(active.with.id, activeId, false)}
              onVideoCall={() => call.startCall(active.with.id, activeId, true)}
              onViewProfile={() => nav("profile", { userId: active.with.id })}
            />
          </div>
        </>
      )}
    </div>
  );
}
