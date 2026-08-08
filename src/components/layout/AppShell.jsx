import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  LayoutDashboard,
  Search,
  Users,
  Plus,
  FolderKanban,
  MessageSquare,
  Wallet,
  Bell,
  User,
  Settings,
  Crown,
  LogOut,
  LogIn,
  Menu,
  X,
  CircleDollarSign,
  Mail,
  Star,
  Info,
  CheckCheck,
  Briefcase,
} from "lucide-react";
import { DASHBOARD_FOR, useNav } from "../../nav.jsx";
import { useLive } from "../../live.jsx";
import { logoutUser, getAccessToken } from "../../lib/authApi.js";
import { fetchNotifications, markAllNotificationsRead } from "../../lib/notificationsApi.js";

const NOTIF_META = {
  payment: { Icon: CircleDollarSign, cls: "text-mint border-mint/30 bg-mint/10" },
  message: { Icon: MessageSquare, cls: "text-neon border-neon/30 bg-neon/10" },
  job: { Icon: Briefcase, cls: "text-brand-soft border-brand/30 bg-brand/10" },
  invite: { Icon: Mail, cls: "text-brand-soft border-brand/30 bg-brand/10" },
  review: { Icon: Star, cls: "text-amber-400 border-amber-400/30 bg-amber-400/10" },
  system: { Icon: Info, cls: "text-white/60 border-white/15 bg-white/[0.05]" },
};

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// "Profile" tab-ийг чирэхдээ userId дамжуулдаг — үгүй бол FreelancerProfile.jsx
// params.userId байхгүй тул зохиомол mock хүн (TALENT[1]) харуулдаг байсан bug.
// Дунд товч нь горимоос хамаарна: захиалагчид "Post a Job", ажил гүйцэтгэгчид
// "Find Work" — өмнө нь хоёуланд нь "Post" гардаг байсан тул freelancer
// хүн дарахад 403 авдаг байв.
const TABS = [
  { page: "dashboard", label: "Home", Icon: LayoutDashboard },
  { page: "find-work", label: "Jobs", Icon: Search, alias: ["project"], modes: ["freelancer"] },
  { page: "find-talent", label: "Talent", Icon: Users, modes: ["client"] },
  { page: "post-job", label: "Post", Icon: Plus, modes: ["client"], accent: true },
  { page: "my-projects", label: "Work", Icon: FolderKanban, alias: ["tracker"], modes: ["freelancer"], accent: true },
  { page: "messages", label: "Chat", Icon: MessageSquare, live: "messages" },
  { page: "profile", label: "Profile", Icon: User, own: true },
];

// Notification bell болон account (profile/settings/log out) одоо дээд
// баруун буланд (DesktopTopBar) байгаа тул sidebar-ийн жагсаалтад давхардуулж
// оруулахгүй — зөвхөн үндсэн ажлын урсгал энд үлдэнэ.
// `modes` заагаагүй мөр нь хоёр горимд хоёуланд нь харагдана. Өмнө нь бүх
// мөр нэг дор гардаг байсан тул freelancer хүн "Post a Job"/"Find Talent"-ыг,
// захиалагч "Find Work"-ийг харж, дарвал 403 авдаг байв.
const MAIN = [
  { page: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { page: "find-work", label: "Find Work", Icon: Search, alias: ["project"], modes: ["freelancer"] },
  { page: "find-talent", label: "Find Talent", Icon: Users, modes: ["client"] },
  { page: "post-job", label: "Post a Job", Icon: Plus, modes: ["client"] },
  { page: "my-projects", label: "My Projects", Icon: FolderKanban, alias: ["tracker"] },
  { page: "messages", label: "Messages", Icon: MessageSquare, live: "messages" },
  { page: "payments", label: "Payments", Icon: Wallet },
];

// "dashboard" бол хийсвэр мөр — бодит хуудас нь горимоос хамаарна.
function resolveNavItem(item, mode) {
  if (item.page !== "dashboard") return item;
  const page = DASHBOARD_FOR[mode] || DASHBOARD_FOR.freelancer;
  const other = page === DASHBOARD_FOR.freelancer ? DASHBOARD_FOR.client : DASHBOARD_FOR.freelancer;
  // Нөгөө dashboard-ыг alias-д үлдээв: горим солих агшинд ч идэвхтэй
  // төлөв нь анивчихгүй.
  return { ...item, page, alias: [other] };
}

function isActive(item, page) {
  return item.page === page || (item.alias || []).includes(page);
}

/**
 * Label that appears on hover when the rail is collapsed. Rendered through a
 * portal into document.body (positioned from the anchor's bounding rect) so
 * it never becomes a descendant of the scrolling <nav> — a normal absolutely
 * positioned child there gets clipped and, worse, forces the CSS overflow-x
 * of an overflow-y:auto container to compute as "auto" too, which produced a
 * stray horizontal scrollbar under the icon rail.
 */
function RailTip({ anchorRef, active, children }) {
  const [pos, setPos] = useState(null);

  useEffect(() => {
    if (!active || !anchorRef.current) return;
    const r = anchorRef.current.getBoundingClientRect();
    setPos({ top: r.top + r.height / 2, left: r.right + 12 });
  }, [active, anchorRef]);

  if (!active || !pos) return null;

  return createPortal(
    <span
      style={{ top: pos.top, left: pos.left }}
      className="animate-toast-in pointer-events-none fixed z-50 -translate-y-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-[#0d1411] px-2.5 py-1.5 text-[12px] font-medium text-white shadow-[0_8px_24px_rgba(0,0,0,0.6)]"
    >
      {children}
    </span>,
    document.body
  );
}

function railRowClass(active, admin, collapsed) {
  return `relative flex w-full items-center rounded-xl text-left text-[13.5px] font-medium transition-colors ${
    collapsed ? "justify-center px-0 py-3" : "gap-3 px-3.5 py-2.5"
  } ${
    active
      ? admin ? "bg-amber-400/15 text-amber-300" : "bg-brand/15 text-brand-soft"
      : admin ? "text-amber-300/70 hover:bg-amber-400/10 hover:text-amber-300" : "text-white/60 hover:bg-white/5 hover:text-white"
  }`;
}

function NavRow({ page: p, label, Icon, active, badge, collapsed, onClick }) {
  const ref = useRef(null);
  const [hovered, setHovered] = useState(false);

  return (
    <button
      ref={ref}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={railRowClass(active, false, collapsed)}
      aria-label={label}
    >
      <span className="relative shrink-0">
        <Icon className="h-[18px] w-[18px]" />
        {collapsed && badge > 0 && (
          <span key={badge} className="absolute -right-1.5 -top-1.5 flex h-3.5 min-w-3.5 animate-badge-pop items-center justify-center rounded-full bg-brand px-0.5 text-[8.5px] font-bold text-ink">
            {badge}
          </span>
        )}
      </span>
      {!collapsed && (
        <>
          <span className="flex-1">{label}</span>
          {badge > 0 && (
            <span key={badge} className="flex h-5 min-w-5 animate-badge-pop items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-ink">
              {badge}
            </span>
          )}
          {active && <span className="h-4 w-1 rounded-full bg-brand" />}
        </>
      )}
      {collapsed && active && <span className="absolute left-0 h-5 w-0.5 rounded-r-full bg-brand" />}
      {collapsed && (
        <RailTip anchorRef={ref} active={hovered}>
          {label}
        </RailTip>
      )}
    </button>
  );
}

function AdminRow({ active, collapsed, onClick }) {
  const ref = useRef(null);
  const [hovered, setHovered] = useState(false);

  return (
    <button
      ref={ref}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={railRowClass(active, true, collapsed)}
      aria-label="Admin Panel"
    >
      <Crown className="h-[18px] w-[18px] shrink-0" />
      {!collapsed && (
        <>
          <span className="flex-1">Admin Panel</span>
          <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[8.5px] font-bold uppercase tracking-wider text-amber-300">
            Root
          </span>
        </>
      )}
      {collapsed && (
        <RailTip anchorRef={ref} active={hovered}>
          Admin Panel
        </RailTip>
      )}
    </button>
  );
}

function NavList({ page, go, collapsed, role, mode }) {
  const { unread } = useLive();

  const items = MAIN
    .filter((item) => !item.modes || item.modes.includes(mode))
    .map((item) => resolveNavItem(item, mode));

  return (
    <nav className={`flex-1 space-y-1 overflow-y-auto overflow-x-hidden py-4 ${collapsed ? "px-2" : "px-3"}`}>
      {items.map(({ page: p, label, Icon, live, alias }) => (
        <NavRow
          key={label}
          page={p}
          label={label}
          Icon={Icon}
          active={isActive({ page: p, alias }, page)}
          badge={live ? unread[live] || 0 : 0}
          collapsed={collapsed}
          onClick={() => go(p)}
        />
      ))}

      {role === "admin" && (
        <>
          <div className="my-2 border-t border-white/8" />
          <AdminRow active={page === "admin"} collapsed={collapsed} onClick={() => go("admin")} />
        </>
      )}
    </nav>
  );
}

/**
 * Freelancer ⇄ Client горим солигч.
 *
 * Нэг хүн хоёуланд нь байж болно (өдөр ажил захиалж, орой ажил хайх) —
 * өмнө нь горимыг зөвхөн онбординг дээр нэг удаа сонгодог, дараа нь өөрчлөх
 * ямар ч зам байхгүй байсан. Хараахан үүсээгүй профайл руу шилжихийг
 * оролдвол switchMode() өөрөө onboarding руу оруулна — тиймээс энд хоёр
 * товчийг үргэлж харуулж, дутуу талыг нь "Set up" гэж тэмдэглэнэ.
 */
function ModeSwitcher({ collapsed, mode, user, onSwitch }) {
  if (!user) return null;

  const OPTIONS = [
    { key: "freelancer", label: "Freelancing", Icon: Search, ready: !!user.hasFreelancerProfile },
    { key: "client", label: "Hiring", Icon: Briefcase, ready: !!user.hasClientProfile },
  ];

  if (collapsed) {
    const other = OPTIONS.find((o) => o.key !== mode);
    if (!other) return null;
    return (
      <div className="px-2 pt-3">
        <button
          onClick={() => onSwitch(other.key)}
          aria-label={`Switch to ${other.label}`}
          className="flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-white/70 transition-colors hover:bg-white/[0.08] hover:text-white"
        >
          <other.Icon className="h-[18px] w-[18px]" />
        </button>
      </div>
    );
  }

  return (
    <div className="px-3 pt-4">
      <p className="px-1 pb-1.5 text-[9.5px] font-bold uppercase tracking-[0.14em] text-white/30">
        Working as
      </p>
      <div
        role="radiogroup"
        aria-label="Working mode"
        className="grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1"
      >
        {OPTIONS.map(({ key, label, Icon, ready }) => {
          const active = mode === key;
          return (
            <button
              key={key}
              role="radio"
              aria-checked={active}
              onClick={() => onSwitch(key)}
              title={ready ? label : `${label} — set up your profile first`}
              className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[11.5px] font-semibold transition-all ${
                active
                  ? "bg-brand text-ink shadow-sm"
                  : "text-white/55 hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{label}</span>
              {!ready && (
                <span
                  aria-hidden="true"
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${active ? "bg-ink/40" : "bg-amber-400/70"}`}
                />
              )}
            </button>
          );
        })}
      </div>
      {!OPTIONS.find((o) => o.key === mode)?.ready && (
        <p className="px-1 pt-1.5 text-[10.5px] leading-snug text-amber-300/80">
          Profile not set up yet — you'll be asked to finish it.
        </p>
      )}
    </div>
  );
}

function initialsOf(text) {
  return (text || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function UserCard({ go, collapsed, user, setUser, authReady }) {
  const avatarRef = useRef(null);
  const [avatarHovered, setAvatarHovered] = useState(false);
  const logoutRef = useRef(null);
  const [logoutHovered, setLogoutHovered] = useState(false);

  // Still resolving the initial /auth/me call — render neither the login
  // prompt nor a persona so an already-logged-in user doesn't see a flash
  // of "Log in" before their real name loads in.
  if (!authReady) {
    return <div className={`border-t border-white/8 ${collapsed ? "p-2" : "p-3"}`} />;
  }

  // Public pages (Find Work/Talent, job/profile detail) render inside this
  // shell even for anonymous visitors — show a real "log in" prompt instead
  // of a fake logged-in persona.
  if (!user) {
    return (
      <div className={`border-t border-white/8 ${collapsed ? "p-2" : "p-3"}`}>
        <button
          onClick={() => go("auth")}
          aria-label="Log in"
          className={`flex w-full items-center rounded-xl text-[13px] font-semibold text-brand-soft transition-colors hover:bg-white/5 hover:text-white ${
            collapsed ? "justify-center p-2.5" : "gap-2.5 p-2.5"
          }`}
        >
          <LogIn className="h-4 w-4 shrink-0" />
          {!collapsed && "Log in"}
        </button>
      </div>
    );
  }

  const isAdmin = user.role === "ADMIN";
  const initials = initialsOf(user.name || user.email);
  const name = user.name || user.email;
  const subtitle = isAdmin ? "Superadmin" : user.email;
  const logout = () => {
    logoutUser(); // best-effort: revokes refresh token server-side + clears local tokens
    setUser(null);
    go("home");
  };

  return (
    <div className={`border-t border-white/8 ${collapsed ? "p-2" : "p-3"}`}>
      <div className={`flex items-center rounded-xl ${collapsed ? "justify-center p-1.5" : "gap-3 p-2"}`}>
        <span
          ref={avatarRef}
          onMouseEnter={() => setAvatarHovered(true)}
          onMouseLeave={() => setAvatarHovered(false)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand/50 to-neon/40 font-display text-[12px] font-bold ring-1 ring-white/15"
        >
          {initials}
          {collapsed && (
            <RailTip anchorRef={avatarRef} active={avatarHovered}>
              {name} · Log out
            </RailTip>
          )}
        </span>
        {!collapsed && (
          <>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold">{name}</p>
              <p className="truncate text-[11px] text-white/40">{subtitle}</p>
            </div>
            <button
              onClick={logout}
              aria-label="Log out"
              className="rounded-lg p-2 text-white/40 transition-colors hover:bg-white/5 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
      {collapsed && (
        <button
          ref={logoutRef}
          onClick={logout}
          onMouseEnter={() => setLogoutHovered(true)}
          onMouseLeave={() => setLogoutHovered(false)}
          aria-label="Log out"
          className="mt-1 flex w-full justify-center rounded-xl py-2.5 text-white/40 transition-colors hover:bg-white/5 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          <RailTip anchorRef={logoutRef} active={logoutHovered}>
            Log out
          </RailTip>
        </button>
      )}
    </div>
  );
}

// Notification bell opens an in-place dropdown (portaled so it isn't
// clipped by the sidebar's overflow-y:auto) instead of navigating away —
// the full Notifications page is still reachable via "View all".
function NotifDropdown({ anchorRef, open, onClose, onViewAll, align = "left" }) {
  const [pos, setPos] = useState(null);
  const panelRef = useRef(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !anchorRef.current) return;
    const r = anchorRef.current.getBoundingClientRect();
    setPos(
      align === "right"
        ? { top: r.bottom + 10, right: window.innerWidth - r.right }
        : { top: r.bottom + 10, left: r.left }
    );
  }, [open, anchorRef, align]);

  // Fetch fresh each time it's opened rather than polling in the background —
  // this is a rarely-open dropdown, not a live feed.
  useEffect(() => {
    if (!open) return;
    const token = getAccessToken();
    if (!token) { setItems([]); setLoading(false); return; }
    setLoading(true);
    fetchNotifications(token)
      .then((res) => setItems(res.notifications.slice(0, 5)))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (panelRef.current?.contains(e.target) || anchorRef.current?.contains(e.target)) return;
      onClose();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, onClose, anchorRef]);

  if (!open || !pos) return null;

  const unreadCount = items.filter((n) => !n.read).length;

  return createPortal(
    <div
      ref={panelRef}
      style={pos}
      className="animate-toast-in fixed z-50 w-[340px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-white/10 bg-[#0d1411] shadow-[0_24px_60px_rgba(0,0,0,0.6)]"
    >
      <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
        <p className="text-[13px] font-bold">Notifications</p>
        <button
          onClick={() => { markAllNotificationsRead(getAccessToken()).catch(() => {}); setItems((arr) => arr.map((n) => ({ ...n, read: true }))); }}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-white/40 transition-colors hover:text-mint"
        >
          <CheckCheck className="h-3.5 w-3.5" />
          {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
        </button>
      </div>
      <div className="max-h-[360px] overflow-y-auto">
        {loading && <p className="px-4 py-6 text-center text-[12px] text-white/35">Ачааллаж байна…</p>}
        {!loading && items.length === 0 && (
          <p className="px-4 py-6 text-center text-[12px] text-white/35">No notifications yet</p>
        )}
        {items.map((n) => {
          const { Icon, cls } = NOTIF_META[n.type] || NOTIF_META.system;
          return (
            <div key={n.id} className="flex items-start gap-3 border-b border-white/5 px-4 py-3 last:border-b-0 hover:bg-white/[0.03]">
              <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${cls}`}>
                <Icon className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] leading-snug text-white/85">{n.text}</p>
                <p className="mt-0.5 text-[10.5px] text-white/35">{timeAgo(n.createdAt)}</p>
              </div>
              {!n.read && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />}
            </div>
          );
        })}
      </div>
      <button
        onClick={onViewAll}
        className="block w-full border-t border-white/8 py-3 text-center text-[12px] font-semibold text-brand-soft transition-colors hover:bg-white/[0.03] hover:text-white"
      >
        View all notifications
      </button>
    </div>,
    document.body
  );
}

function NotifBell({ collapsed, badge, onViewAll, align, buttonClassName, dotClassName }) {
  const ref = useRef(null);
  const [hovered, setHovered] = useState(false);
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        ref={ref}
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        aria-label="Notifications"
        className={buttonClassName || "relative rounded-lg p-2 text-white/40 transition-colors hover:bg-white/5 hover:text-white"}
      >
        <Bell className="h-4.5 w-4.5" />
        {badge > 0 && (
          <span className={dotClassName || "absolute right-1 top-1 h-2 w-2 rounded-full bg-brand ring-2 ring-[#141517]"} />
        )}
        {collapsed && !open && (
          <RailTip anchorRef={ref} active={hovered}>
            Notifications{badge > 0 ? ` · ${badge}` : ""}
          </RailTip>
        )}
      </button>
      <NotifDropdown
        anchorRef={ref}
        open={open}
        align={align}
        onClose={() => setOpen(false)}
        onViewAll={() => { setOpen(false); onViewAll(); }}
      />
    </>
  );
}

function Brand({ go, collapsed }) {
  if (collapsed) {
    return (
      <button onClick={() => go("home")} className="flex justify-center py-5 font-display text-lg font-bold tracking-tight" aria-label="KREATIV home">
        <span className="bg-gradient-to-r from-brand-soft to-neon bg-clip-text text-transparent">K</span>
      </button>
    );
  }
  return (
    <button onClick={() => go("home")} className="flex items-center gap-2 px-5 py-5 font-display text-lg tracking-tight">
      <span className="font-bold">KRE</span>
      <span className="bg-gradient-to-r from-brand-soft to-neon bg-clip-text font-bold text-transparent">ATIV</span>
    </button>
  );
}

// Account dropdown (avatar + name → view profile / settings / log out) —
// шилжсэн байрлал: sidebar-ийн ёроолд байсныг deed баруун буланд авчирсан.
function UserMenu({ go, user, setUser }) {
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (!rootRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const isAdmin = user.role === "ADMIN";
  const initials = initialsOf(user.name || user.email);
  const logout = () => {
    logoutUser();
    setUser(null);
    setOpen(false);
    go("home");
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        className="flex items-center gap-2.5 rounded-xl py-1.5 pl-1.5 pr-3 text-left transition-colors hover:bg-white/5"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand/50 to-neon/40 font-display text-[11px] font-bold ring-1 ring-white/15">
          {initials}
        </span>
        <span className="hidden sm:block">
          <span className="block max-w-[140px] truncate text-[12.5px] font-semibold leading-tight">{user.name || user.email}</span>
          <span className="block text-[10.5px] leading-tight text-white/40">{isAdmin ? "Superadmin" : "Account"}</span>
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-56 overflow-hidden rounded-2xl border border-white/10 bg-[#0d1411] shadow-[0_24px_60px_rgba(0,0,0,0.6)]">
          <div className="border-b border-white/8 px-4 py-3">
            <p className="truncate text-[13px] font-semibold">{user.name || "Account"}</p>
            <p className="truncate text-[11.5px] text-white/40">{user.email}</p>
          </div>
          <button
            onClick={() => { setOpen(false); go("profile", { userId: user.id }); }}
            className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-[13px] text-white/80 transition-colors hover:bg-white/5"
          >
            <User className="h-4 w-4 text-white/40" /> View profile
          </button>
          <button
            onClick={() => { setOpen(false); go("settings"); }}
            className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-[13px] text-white/80 transition-colors hover:bg-white/5"
          >
            <Settings className="h-4 w-4 text-white/40" /> Settings
          </button>
          {isAdmin && (
            <button
              onClick={() => { setOpen(false); go("admin"); }}
              className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-[13px] text-amber-300 transition-colors hover:bg-amber-400/10"
            >
              <Crown className="h-4 w-4" /> Admin Panel
            </button>
          )}
          <div className="border-t border-white/8" />
          <button
            onClick={logout}
            className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-[13px] text-red-400 transition-colors hover:bg-red-500/10"
          >
            <LogOut className="h-4 w-4" /> Log out
          </button>
        </div>
      )}
    </div>
  );
}

// Desktop-only top bar — notification bell + account menu, deed баруун
// буланд байрлана (өмнө нь sidebar дотор шингэсэн байсан).
function DesktopTopBar({ go, user, setUser, authReady, notifBadge }) {
  return (
    <div className="sticky top-0 z-30 hidden items-center justify-end gap-2 border-b border-white/8 bg-[#141517]/80 px-6 py-3 lg:flex">
      {authReady && user && <NotifBell badge={notifBadge} align="right" onViewAll={() => go("notifications")} />}
      {authReady && (
        user ? (
          <UserMenu go={go} user={user} setUser={setUser} />
        ) : (
          <button
            onClick={() => go("auth")}
            className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-[13px] font-semibold text-brand-soft transition-colors hover:bg-white/5"
          >
            <LogIn className="h-4 w-4" /> Log in
          </button>
        )
      )}
    </div>
  );
}

export default function AppShell({ children }) {
  const { page, nav, role, user, setUser, authReady, mode, switchMode } = useNav();
  const { unread } = useLive();
  const [open, setOpen] = useState(false); // mobile drawer
  const notifBadge = unread.notifications || 0;

  const go = (p, params) => { setOpen(false); nav(p, params); };

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <div className="min-h-screen bg-ink text-white lg:grid lg:grid-cols-[264px_1fr]">
      {/* Desktop sidebar — always shows icon + label, no more hover-to-reveal */}
      <aside className="sticky top-0 z-30 hidden h-screen w-[264px] flex-col border-r border-white/8 bg-[#141517]/95 lg:flex">
        <Brand go={go} collapsed={false} />
        <ModeSwitcher collapsed={false} mode={mode} user={user} onSwitch={switchMode} />
        <NavList page={page} go={go} collapsed={false} role={role} mode={mode} />
      </aside>

      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-white/8 bg-[#141517]/90 px-4 py-3 lg:hidden">
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/80"
        >
          <Menu className="h-5 w-5" />
        </button>
        <button onClick={() => go("home")} className="font-display text-lg tracking-tight">
          <span className="font-bold">KRE</span>
          <span className="bg-gradient-to-r from-brand-soft to-neon bg-clip-text font-bold text-transparent">ATIV</span>
        </button>
        <NotifBell
          badge={notifBadge}
          align="right"
          onViewAll={() => go("notifications")}
          buttonClassName="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/80"
          dotClassName="absolute right-2 top-2 h-2 w-2 rounded-full bg-brand"
        />
      </div>

      {/* Mobile drawer (always full width) */}
      {open && (
        <>
          <div className="fixed inset-0 z-[45] bg-black/50 lg:hidden" onClick={() => setOpen(false)} />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-[280px] max-w-[85vw] animate-feed-in flex-col border-r border-white/10 bg-[#141517] lg:hidden">
            <div className="flex items-center justify-between pr-3">
              <Brand go={go} collapsed={false} />
              <button onClick={() => setOpen(false)} aria-label="Close menu" className="rounded-lg p-2 text-white/50 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <ModeSwitcher
              collapsed={false}
              mode={mode}
              user={user}
              onSwitch={(next) => { setOpen(false); switchMode(next); }}
            />
            <NavList page={page} go={go} collapsed={false} role={role} mode={mode} />
            <UserCard go={go} collapsed={false} user={user} setUser={setUser} authReady={authReady} />
          </aside>
        </>
      )}

      {/* Content (each view provides its own max-w container) */}
      <main className="min-w-0 pb-20 lg:pb-0">
        <DesktopTopBar go={go} user={user} setUser={setUser} authReady={authReady} notifBadge={notifBadge} />
        {children}
      </main>

      <MobileTabBar page={page} go={go} user={user} mode={mode} />
    </div>
  );
}

// App-style bottom tab bar for mobile — quick access to the 5 most-used
// destinations, mirroring the drawer's full nav for everything else.
function MobileTabBar({ page, go, user, mode }) {
  const { unread } = useLive();

  const tabs = TABS
    .filter((item) => !item.modes || item.modes.includes(mode))
    .map((item) => resolveNavItem(item, mode));

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-white/8 bg-[#141517]/95 px-1 lg:hidden">
      {tabs.map(({ page: p, label, Icon, alias, live, own, accent }) => {
        const active = isActive({ page: p, alias }, page);
        const badge = live ? unread[live] || 0 : 0;
        const isPost = !!accent;

        return (
          <button
            key={label}
            onClick={() => go(p, own && user ? { userId: user.id } : undefined)}
            aria-label={label}
            className={`relative flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-semibold transition-colors ${
              active ? "text-brand-soft" : "text-white/45"
            }`}
          >
            {isPost ? (
              <span className="-mt-6 flex h-11 w-11 items-center justify-center rounded-full bg-brand text-ink">
                <Icon className="h-5 w-5" />
              </span>
            ) : (
              <span className="relative">
                <Icon className="h-5 w-5" />
                {badge > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-brand px-0.5 text-[8px] font-bold text-ink">
                    {badge}
                  </span>
                )}
              </span>
            )}
            {!isPost && label}
          </button>
        );
      })}
    </nav>
  );
}
