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
} from "lucide-react";
import { useNav } from "../../nav.jsx";
import { useLive } from "../../live.jsx";
import { logoutUser } from "../../lib/authApi.js";
import { NOTIFS } from "../../data/appMock.js";

const NOTIF_META = {
  payment: { Icon: CircleDollarSign, cls: "text-mint border-mint/30 bg-mint/10" },
  message: { Icon: MessageSquare, cls: "text-neon border-neon/30 bg-neon/10" },
  invite: { Icon: Mail, cls: "text-brand-soft border-brand/30 bg-brand/10" },
  review: { Icon: Star, cls: "text-amber-400 border-amber-400/30 bg-amber-400/10" },
  system: { Icon: Info, cls: "text-white/60 border-white/15 bg-white/[0.05]" },
};

const TABS = [
  { page: "freelancer-dashboard", label: "Home", Icon: LayoutDashboard, alias: ["client-dashboard"] },
  { page: "find-work", label: "Jobs", Icon: Search, alias: ["project"] },
  { page: "post-job", label: "Post", Icon: Plus },
  { page: "messages", label: "Chat", Icon: MessageSquare, live: "messages" },
  { page: "profile", label: "Profile", Icon: User },
];

const MAIN = [
  { page: "freelancer-dashboard", label: "Dashboard", Icon: LayoutDashboard, alias: ["client-dashboard"] },
  { page: "find-work", label: "Find Work", Icon: Search, alias: ["project"] },
  { page: "find-talent", label: "Find Talent", Icon: Users },
  { page: "post-job", label: "Post a Job", Icon: Plus },
  { page: "my-projects", label: "My Projects", Icon: FolderKanban, alias: ["tracker"] },
  { page: "messages", label: "Messages", Icon: MessageSquare, live: "messages" },
  { page: "payments", label: "Payments", Icon: Wallet },
  { page: "profile", label: "Profile", Icon: User },
  { page: "settings", label: "Settings", Icon: Settings },
];

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

function NavList({ page, go, collapsed, role }) {
  const { unread } = useLive();

  return (
    <nav className={`flex-1 space-y-1 overflow-y-auto overflow-x-hidden py-4 ${collapsed ? "px-2" : "px-3"}`}>
      {MAIN.map(({ page: p, label, Icon, live, alias }) => (
        <NavRow
          key={p}
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

  useEffect(() => {
    if (!open || !anchorRef.current) return;
    const r = anchorRef.current.getBoundingClientRect();
    setPos(
      align === "right"
        ? { top: r.bottom + 10, right: window.innerWidth - r.right }
        : { top: r.bottom + 10, left: r.left }
    );
  }, [open, anchorRef, align]);

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

  const recent = NOTIFS.slice(0, 5);
  const unreadCount = recent.filter((n) => n.unread).length;

  return createPortal(
    <div
      ref={panelRef}
      style={pos}
      className="animate-toast-in fixed z-50 w-[340px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-white/10 bg-[#0d1411] shadow-[0_24px_60px_rgba(0,0,0,0.6)]"
    >
      <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
        <p className="text-[13px] font-bold">Notifications</p>
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-white/40">
          <CheckCheck className="h-3.5 w-3.5" />
          {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
        </span>
      </div>
      <div className="max-h-[360px] overflow-y-auto">
        {recent.map((n, i) => {
          const { Icon, cls } = NOTIF_META[n.type];
          return (
            <div key={i} className="flex items-start gap-3 border-b border-white/5 px-4 py-3 last:border-b-0 hover:bg-white/[0.03]">
              <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${cls}`}>
                <Icon className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] leading-snug text-white/85">{n.text}</p>
                <p className="mt-0.5 text-[10.5px] text-white/35">{n.time}</p>
              </div>
              {n.unread && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />}
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
          <span className={dotClassName || "absolute right-1 top-1 h-2 w-2 rounded-full bg-brand ring-2 ring-[#070b09]"} />
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

export default function AppShell({ children }) {
  const { page, nav, role, user, setUser, authReady } = useNav();
  const { unread } = useLive();
  const [open, setOpen] = useState(false); // mobile drawer
  // Desktop rail: rests collapsed (icons only) and expands on hover/focus —
  // no manual toggle. It overlays the content (fixed 76px grid track) so
  // expanding never reflows the main content.
  const [hovering, setHovering] = useState(false);
  const collapsed = !hovering;
  const notifBadge = unread.notifications || 0;

  const go = (p) => { setOpen(false); nav(p); };

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <div className="min-h-screen bg-ink text-white lg:grid lg:grid-cols-[76px_1fr]">
      {/* Desktop sidebar — collapsed by default, expands over the content on hover/focus */}
      <aside
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        onFocus={() => setHovering(true)}
        onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setHovering(false); }}
        className={`sticky top-0 z-30 hidden h-screen flex-col border-r border-white/8 bg-[#070b09]/95 backdrop-blur-xl transition-[width] duration-200 ease-out lg:flex ${
          collapsed ? "w-[76px]" : "w-[264px] shadow-[0_20px_60px_rgba(0,0,0,0.55)]"
        }`}
      >
        <div className={`flex items-center ${collapsed ? "flex-col gap-1" : "justify-between pr-3"}`}>
          <Brand go={go} collapsed={collapsed} />
          <NotifBell collapsed={collapsed} badge={notifBadge} onViewAll={() => go("notifications")} />
        </div>
        <NavList page={page} go={go} collapsed={collapsed} role={role} />
        <UserCard go={go} collapsed={collapsed} user={user} setUser={setUser} authReady={authReady} />
      </aside>

      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-white/8 bg-[#070b09]/90 px-4 py-3 backdrop-blur-xl lg:hidden">
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
          <div className="fixed inset-0 z-[45] bg-black/50 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-[280px] max-w-[85vw] animate-feed-in flex-col border-r border-white/10 bg-[#070b09] lg:hidden">
            <div className="flex items-center justify-between pr-3">
              <Brand go={go} collapsed={false} />
              <button onClick={() => setOpen(false)} aria-label="Close menu" className="rounded-lg p-2 text-white/50 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavList page={page} go={go} collapsed={false} role={role} />
            <UserCard go={go} collapsed={false} user={user} setUser={setUser} authReady={authReady} />
          </aside>
        </>
      )}

      {/* Content (each view provides its own max-w container) */}
      <main className="min-w-0 pb-20 lg:pb-0">{children}</main>

      <MobileTabBar page={page} go={go} />
    </div>
  );
}

// App-style bottom tab bar for mobile — quick access to the 5 most-used
// destinations, mirroring the drawer's full nav for everything else.
function MobileTabBar({ page, go }) {
  const { unread } = useLive();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-white/8 bg-[#070b09]/95 px-1 backdrop-blur-xl lg:hidden">
      {TABS.map(({ page: p, label, Icon, alias, live }) => {
        const active = isActive({ page: p, alias }, page);
        const badge = live ? unread[live] || 0 : 0;
        const isPost = p === "post-job";

        return (
          <button
            key={p}
            onClick={() => go(p)}
            aria-label={label}
            className={`relative flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-semibold transition-colors ${
              active ? "text-brand-soft" : "text-white/45"
            }`}
          >
            {isPost ? (
              <span className="-mt-6 flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-soft text-ink shadow-[0_6px_20px_rgba(0,211,149,0.5)]">
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
