import { useEffect, useState } from "react";
import { useNav } from "../../nav.jsx";
import {
  Crown,
  Users,
  Scale,
  ShieldCheck,
  Wallet,
  Search,
  BadgeCheck,
  Ban,
  RotateCcw,
  AlertTriangle,
  Activity,
  LayoutDashboard,
} from "lucide-react";
import CountUp from "../fx/CountUp.jsx";
import {
  ADMIN_STATS,
  ADMIN_SIGNUPS,
  ROLE_DIST,
  FRAUD_ALERTS,
  ADMIN_USERS,
  ADMIN_DISPUTES,
  ADMIN_ESCROWS,
} from "../../data/appMock.js";

const TABS = [
  { id: "overview", label: "Overview", Icon: LayoutDashboard },
  { id: "users", label: "Users & Roles", Icon: Users },
  { id: "disputes", label: "Disputes", Icon: Scale },
  { id: "escrow", label: "Escrow Monitor", Icon: Wallet },
];

const ROLE_BADGE = {
  Superadmin: "border-amber-400/40 bg-amber-400/10 text-amber-300",
  Client: "border-brand/40 bg-brand/10 text-brand-soft",
  Freelancer: "border-neon/40 bg-neon/10 text-neon",
};

const STATUS_BADGE = {
  Active: "border-mint/30 bg-mint/10 text-mint",
  Pending: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  Suspended: "border-red-500/40 bg-red-500/10 text-red-400",
};

const DISPUTE_BADGE = {
  New: "border-neon/30 bg-neon/10 text-neon",
  Evidence: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  Deciding: "border-brand/40 bg-brand/10 text-brand-soft",
};

const ESCROW_BADGE = {
  Funded: "border-brand/40 bg-brand/10 text-brand-soft",
  "Pending deposit": "border-amber-400/30 bg-amber-400/10 text-amber-300",
  "Release queued": "border-mint/30 bg-mint/10 text-mint",
};

export default function AdminPanel() {
  const { role, nav } = useNav();

  // Direct hash navigation (#/admin) bypasses the sidebar's gating, so guard
  // the view itself too — no backend to enforce this server-side. `nav` is a
  // fresh closure every NavProvider render (not memoized), so it's
  // deliberately left out of the deps: including it re-triggers this effect
  // on every render and loops.
  useEffect(() => {
    if (role !== "admin") nav("client-dashboard");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const [tab, setTab] = useState("overview");
  const [users, setUsers] = useState(ADMIN_USERS);
  const [disputes, setDisputes] = useState(ADMIN_DISPUTES);
  const [roleFilter, setRoleFilter] = useState("All");
  const [q, setQ] = useState("");

  const setStatus = (id, status) =>
    setUsers((u) => u.map((x) => (x.id === id ? { ...x, status } : x)));

  const resolve = (id, outcome) =>
    setDisputes((d) =>
      d.map((x) => (x.id === id ? { ...x, status: `Resolved · ${outcome}` } : x))
    );

  const shown = users.filter(
    (u) =>
      (roleFilter === "All" || u.role === roleFilter) &&
      (q === "" || (u.name + u.email).toLowerCase().includes(q.toLowerCase()))
  );

  const maxSignup = Math.max(...ADMIN_SIGNUPS.map((s) => s.v));

  return (
    <div className="mx-auto max-w-6xl px-6 pb-24 pt-8">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-300">
            <Crown className="h-3.5 w-3.5" />
            — Platform control
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">
            Welcome, Ulaanaa
          </h1>
          <p className="mt-1.5 text-[13px] text-white/45">
            Full visibility over every role, payment, and dispute on KREATIV.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-amber-300 shadow-[0_0_24px_rgba(251,191,36,0.25)]">
          <Crown className="h-4 w-4" />
          Superadmin
        </span>
      </div>

      <div className="mt-7 flex flex-wrap gap-2">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={
              tab === id
                ? "inline-flex items-center gap-2 rounded-xl bg-brand px-4.5 py-2.5 text-[13px] font-semibold glow-brand"
                : "glass inline-flex items-center gap-2 rounded-xl px-4.5 py-2.5 text-[13px] font-medium text-white/55 transition-colors hover:text-white"
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ================= OVERVIEW ================= */}
      {tab === "overview" && (
        <>
          <div className="mt-7 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {ADMIN_STATS.map((s) => (
              <div key={s.label} className="glass rounded-2xl p-5">
                <p className="font-display text-2xl font-bold">
                  <CountUp to={s.value} prefix={s.prefix || ""} suffix={s.suffix || ""} decimals={s.decimals || 0} />
                </p>
                <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-white/40">
                  {s.label}
                </p>
                <p className="mt-1 text-[11px] text-mint">{s.sub}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-3">
            <div className="glass rounded-2xl p-6 lg:col-span-2">
              <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-white/40">
                <Activity className="h-3.5 w-3.5 text-neon" />
                Signups · last 6 months
              </p>
              <div className="mt-5 flex h-40 items-end gap-3">
                {ADMIN_SIGNUPS.map((s, i) => {
                  const last = i === ADMIN_SIGNUPS.length - 1;
                  return (
                    <div key={s.m} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                      <span className={`text-[10.5px] font-bold ${last ? "text-neon" : "text-white/40"}`}>
                        {s.v.toLocaleString("en-US")}
                      </span>
                      <div
                        className={
                          last
                            ? "w-full rounded-t-lg bg-gradient-to-t from-brand to-neon shadow-[0_0_18px_rgba(6,182,212,0.4)]"
                            : "w-full rounded-t-lg bg-white/12 transition-colors hover:bg-brand/40"
                        }
                        style={{ height: `${Math.round((s.v / maxSignup) * 100)}%` }}
                      />
                      <span className={`text-[10px] font-semibold ${last ? "text-neon" : "text-white/35"}`}>
                        {s.m}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-5">
              <div className="glass rounded-2xl p-6">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
                  Role distribution
                </p>
                <div className="mt-4 space-y-4">
                  {ROLE_DIST.map((r) => (
                    <div key={r.role}>
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="font-semibold text-white/75">{r.role}</span>
                        <span className="text-white/40">{r.count} · {r.pct}%</span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/8">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${r.color}`}
                          style={{ width: `${Math.max(r.pct, 3)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass rounded-2xl p-6">
                <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-amber-300">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  AI fraud alerts
                </p>
                <div className="mt-3 space-y-2.5">
                  {FRAUD_ALERTS.map((a, i) => (
                    <div key={i} className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
                      <p className="text-[12px] leading-snug text-white/75">{a.text}</p>
                      <p className="mt-1 flex items-center gap-2 text-[10px] text-white/35">
                        <span className={a.level === "High" ? "font-bold text-red-400" : "font-bold text-amber-300"}>
                          {a.level}
                        </span>
                        · {a.time}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ================= USERS & ROLES ================= */}
      {tab === "users" && (
        <div className="glass mt-7 rounded-2xl p-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5">
              <Search className="h-4 w-4 shrink-0 text-white/35" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search name or email…"
                className="w-full bg-transparent text-[13px] outline-none placeholder:text-white/30"
              />
            </div>
            {["All", "Client", "Freelancer", "Superadmin"].map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={
                  roleFilter === r
                    ? "rounded-full bg-brand px-4 py-2 text-[12px] font-semibold glow-brand"
                    : "rounded-full border border-white/10 px-4 py-2 text-[12px] font-medium text-white/55 transition-colors hover:border-brand/40 hover:text-white"
                }
              >
                {r === "All" ? "All roles" : r + "s"}
              </button>
            ))}
          </div>

          <div className="mt-4 divide-y divide-white/6">
            {shown.map((u) => (
              <div key={u.id} className="flex flex-wrap items-center gap-4 py-4">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-display text-[12px] font-bold ring-1 ring-white/15 ${
                    u.role === "Superadmin"
                      ? "bg-gradient-to-br from-amber-400/60 to-amber-300/30"
                      : "bg-gradient-to-br from-brand/50 to-neon/40"
                  }`}
                >
                  {u.initials}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-[13.5px] font-semibold">
                    {u.name}
                    {u.role === "Superadmin" && <Crown className="h-3.5 w-3.5 text-amber-300" />}
                  </p>
                  <p className="truncate text-[11.5px] text-white/40">
                    {u.email} · joined {u.joined}
                  </p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${ROLE_BADGE[u.role]}`}>
                  {u.role}
                </span>
                <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${STATUS_BADGE[u.status]}`}>
                  {u.status}
                </span>
                <div className="flex gap-2">
                  {u.status === "Pending" && (
                    <button
                      onClick={() => setStatus(u.id, "Active")}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-mint/40 bg-mint/10 px-3 py-1.5 text-[11px] font-bold text-mint transition-all hover:bg-mint hover:text-ink"
                    >
                      <BadgeCheck className="h-3.5 w-3.5" />
                      Verify
                    </button>
                  )}
                  {u.status !== "Suspended" && u.role !== "Superadmin" && (
                    <button
                      onClick={() => setStatus(u.id, "Suspended")}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-[11px] font-bold text-red-400 transition-all hover:bg-red-500 hover:text-white"
                    >
                      <Ban className="h-3.5 w-3.5" />
                      Suspend
                    </button>
                  )}
                  {u.status === "Suspended" && (
                    <button
                      onClick={() => setStatus(u.id, "Active")}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.05] px-3 py-1.5 text-[11px] font-bold text-white/70 transition-colors hover:border-mint/40 hover:text-mint"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Restore
                    </button>
                  )}
                </div>
              </div>
            ))}
            {shown.length === 0 && (
              <p className="py-8 text-center text-[13px] text-white/35">
                No users match that search.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ================= DISPUTES ================= */}
      {tab === "disputes" && (
        <div className="mt-7 space-y-3">
          {disputes.map((d) => {
            const resolved = d.status.startsWith("Resolved");
            return (
              <div key={d.id} className="glass rounded-2xl p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2.5 text-[14.5px] font-semibold">
                      {d.project}
                      <span className="text-[10.5px] font-bold text-white/30">{d.id}</span>
                    </p>
                    <p className="mt-1 text-[12px] text-white/40">
                      {d.parties} · {d.amount} in escrow · open {d.age}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider ${
                        resolved
                          ? d.status.includes("Released")
                            ? "border-mint/30 bg-mint/10 text-mint"
                            : "border-brand/40 bg-brand/10 text-brand-soft"
                          : DISPUTE_BADGE[d.status]
                      }`}
                    >
                      {d.status}
                    </span>
                    {!resolved && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => resolve(d.id, "Released")}
                          className="rounded-lg border border-mint/40 bg-mint/10 px-3.5 py-2 text-[11.5px] font-bold text-mint transition-all hover:bg-mint hover:text-ink"
                        >
                          Release to freelancer
                        </button>
                        <button
                          onClick={() => resolve(d.id, "Refunded")}
                          className="rounded-lg border border-brand/40 bg-brand/10 px-3.5 py-2 text-[11.5px] font-bold text-brand-soft transition-all hover:bg-brand hover:text-white"
                        >
                          Refund client
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <p className="pt-2 text-center text-[12px] text-white/35">
            Avg. resolution this month: <b className="text-mint">31 hours</b> · SLA 48h
          </p>
        </div>
      )}

      {/* ================= ESCROW MONITOR ================= */}
      {tab === "escrow" && (
        <div className="glass mt-7 rounded-2xl p-6">
          <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-white/40">
            <ShieldCheck className="h-3.5 w-3.5 text-mint" />
            Live escrow contracts
          </p>
          <div className="mt-3 divide-y divide-white/6">
            {ADMIN_ESCROWS.map((e) => (
              <div key={e.project} className="flex flex-wrap items-center gap-4 py-4">
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-semibold">{e.project}</p>
                  <p className="mt-0.5 text-[11.5px] text-white/40">
                    {e.parties} · since {e.since}
                  </p>
                </div>
                <p className="font-display text-[15px] font-bold">{e.amount}</p>
                <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${ESCROW_BADGE[e.state]}`}>
                  {e.state}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-5 text-[12.5px] text-white/50">
            <span>
              Total locked: <b className="font-display text-mint">$8,700</b> across 4 contracts
            </span>
            <span>
              Commission accrued: <b className="font-display text-brand-soft">$18,400</b> this month
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
