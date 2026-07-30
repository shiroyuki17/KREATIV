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
  Menu,
  X,
} from "lucide-react";
import { useNav } from "../../nav.jsx";
import { useLive } from "../../live.jsx";
import { logoutUser } from "../../lib/authApi.js";

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

function UserCard({ go, collapsed, role, setRole }) {
  const avatarRef = useRef(null);
  const [avatarHovered, setAvatarHovered] = useState(false);
  const logoutRef = useRef(null);
  const [logoutHovered, setLogoutHovered] = useState(false);

  const isAdmin = role === "admin";
  const initials = isAdmin ? "UL" : "AT";
  const name = isAdmin ? "Ulaanaa" : "Ava Torres";
  const subtitle = isAdmin ? "Superadmin" : "Client · Pro plan";
  const logout = () => {
    logoutUser(); // best-effort: revokes refresh token server-side + clears local tokens
    setRole(null);
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

function NotifBell({ collapsed, badge, onClick }) {
  const ref = useRef(null);
  const [hovered, setHovered] = useState(false);

  return (
    <button
      ref={ref}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label="Notifications"
      className="relative rounded-lg p-2 text-white/40 transition-colors hover:bg-white/5 hover:text-white"
    >
      <Bell className="h-4.5 w-4.5" />
      {badge > 0 && (
        <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-brand ring-2 ring-[#070b09]" />
      )}
      {collapsed && (
        <RailTip anchorRef={ref} active={hovered}>
          Notifications{badge > 0 ? ` · ${badge}` : ""}
        </RailTip>
      )}
    </button>
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
  const { page, nav, role, setRole } = useNav();
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
          <NotifBell collapsed={collapsed} badge={notifBadge} onClick={() => go("notifications")} />
        </div>
        <NavList page={page} go={go} collapsed={collapsed} role={role} />
        <UserCard go={go} collapsed={collapsed} role={role} setRole={setRole} />
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
        <button
          onClick={() => go("notifications")}
          aria-label="Notifications"
          className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/80"
        >
          <Bell className="h-4.5 w-4.5" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-brand" />
        </button>
      </div>

      {/* Mobile drawer (always full width) */}
      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-[280px] max-w-[85vw] animate-feed-in flex-col border-r border-white/10 bg-[#070b09] lg:hidden">
            <div className="flex items-center justify-between pr-3">
              <Brand go={go} collapsed={false} />
              <button onClick={() => setOpen(false)} aria-label="Close menu" className="rounded-lg p-2 text-white/50 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavList page={page} go={go} collapsed={false} role={role} />
            <UserCard go={go} collapsed={false} role={role} setRole={setRole} />
          </aside>
        </>
      )}

      {/* Content (each view provides its own max-w container) */}
      <main className="min-w-0">{children}</main>
    </div>
  );
}
