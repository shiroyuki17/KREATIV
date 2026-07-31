import { useEffect, useState } from "react";
import { useNav } from "../../nav.jsx";
import {
  Crown,
  Users,
  Wallet,
  Search,
  Ban,
  RotateCcw,
  Activity,
  LayoutDashboard,
  AlertCircle,
  Scale,
} from "lucide-react";
import { getAccessToken } from "../../lib/authApi.js";
import {
  fetchAdminStats,
  fetchAdminUsers,
  setUserActive,
  fetchAdminTransactions,
  fetchAdminDisputes,
  resolveDispute,
} from "../../lib/adminApi.js";

const TABS = [
  { id: "overview", label: "Overview", Icon: LayoutDashboard },
  { id: "users", label: "Users & Roles", Icon: Users },
  { id: "transactions", label: "Transactions", Icon: Wallet },
  { id: "disputes", label: "Disputes", Icon: Scale },
];

const ROLE_BADGE = {
  ADMIN: "border-amber-400/40 bg-amber-400/10 text-amber-300",
  Client: "border-brand/40 bg-brand/10 text-brand-soft",
  Freelancer: "border-neon/40 bg-neon/10 text-neon",
  Unassigned: "border-white/15 bg-white/[0.05] text-white/50",
};

export default function AdminPanel() {
  const { role, nav, user } = useNav();

  // Direct hash navigation (#/admin) bypasses the sidebar's gating, so guard
  // the view itself too. `nav` is a fresh closure every NavProvider render
  // (not memoized), so it's deliberately left out of the deps.
  useEffect(() => {
    if (role !== "admin") nav("client-dashboard");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const [tab, setTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [roleFilter, setRoleFilter] = useState("All");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    Promise.all([
      fetchAdminStats(token),
      fetchAdminUsers({}, token),
      fetchAdminTransactions({ pageSize: 30 }, token),
      fetchAdminDisputes(token),
    ])
      .then(([s, u, t, d]) => {
        setStats(s);
        setUsers(u.users);
        setTransactions(t.transactions);
        setDisputes(d.disputes);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const toggleActive = async (u) => {
    const token = getAccessToken();
    try {
      await setUserActive(u.id, !u.isActive, token);
      setUsers((arr) => arr.map((x) => (x.id === u.id ? { ...x, isActive: !x.isActive } : x)));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleResolve = async (disputeId, resolution) => {
    const token = getAccessToken();
    setResolving(true);
    setError("");
    try {
      const updated = await resolveDispute(disputeId, resolution, token);
      setDisputes((arr) => arr.map((d) => (d.id === disputeId ? { ...d, ...updated } : d)));
    } catch (err) {
      setError(err.message);
    } finally {
      setResolving(false);
    }
  };

  const shown = users.filter(
    (u) =>
      (roleFilter === "All" || u.type === roleFilter || u.role === roleFilter) &&
      (q === "" || (u.name + u.email).toLowerCase().includes(q.toLowerCase()))
  );

  const maxSignup = stats ? Math.max(1, ...stats.signupsByMonth.map((s) => s.count)) : 1;
  const maxRole = stats ? Math.max(1, ...stats.roleDistribution.map((r) => r.count)) : 1;

  if (role !== "admin") return null;

  return (
    <div className="mx-auto max-w-6xl px-6 pb-24 pt-8">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-300">
            <Crown className="h-3.5 w-3.5" />
            — Platform control
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">
            Welcome, {user?.name?.split(" ")[0] || "Admin"}
          </h1>
          <p className="mt-1.5 text-[13px] text-white/45">
            Real visibility over every account, role, and transaction on KREATIV.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-amber-300 shadow-[0_0_24px_rgba(251,191,36,0.25)]">
          <Crown className="h-4 w-4" />
          Superadmin
        </span>
      </div>

      {error && (
        <p className="mt-5 flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-[12.5px] font-medium text-red-400">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
        </p>
      )}

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

      {loading && <p className="mt-8 text-center text-[13px] text-white/40">Ачааллаж байна…</p>}

      {/* ================= OVERVIEW ================= */}
      {!loading && stats && tab === "overview" && (
        <>
          <div className="mt-7 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { label: "Total users", value: stats.totalUsers },
              { label: "Freelancers", value: stats.totalFreelancers },
              { label: "Clients", value: stats.totalClients },
              { label: "Jobs posted", value: stats.totalJobs },
            ].map((s) => (
              <div key={s.label} className="glass rounded-2xl p-5">
                <p className="font-display text-2xl font-bold">{s.value.toLocaleString("en-US")}</p>
                <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-white/40">{s.label}</p>
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
                {stats.signupsByMonth.map((s, i) => {
                  const last = i === stats.signupsByMonth.length - 1;
                  return (
                    <div key={s.month} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                      <span className={`text-[10.5px] font-bold ${last ? "text-neon" : "text-white/40"}`}>{s.count}</span>
                      <div
                        className={
                          last
                            ? "w-full rounded-t-lg bg-gradient-to-t from-brand to-neon shadow-[0_0_18px_rgba(6,182,212,0.4)]"
                            : "w-full rounded-t-lg bg-white/12 transition-colors hover:bg-brand/40"
                        }
                        style={{ height: `${Math.max(4, Math.round((s.count / maxSignup) * 100))}%` }}
                      />
                      <span className={`text-[10px] font-semibold ${last ? "text-neon" : "text-white/35"}`}>{s.month}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="glass rounded-2xl p-6">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-white/40">Role distribution</p>
              <div className="mt-4 space-y-4">
                {stats.roleDistribution.map((r) => (
                  <div key={r.role}>
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="font-semibold text-white/75">{r.role}</span>
                      <span className="text-white/40">{r.count}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/8">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand to-neon"
                        style={{ width: `${Math.max(3, Math.round((r.count / maxRole) * 100))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ================= USERS & ROLES ================= */}
      {!loading && tab === "users" && (
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
            {["All", "Client", "Freelancer", "ADMIN"].map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={
                  roleFilter === r
                    ? "rounded-full bg-brand px-4 py-2 text-[12px] font-semibold glow-brand"
                    : "rounded-full border border-white/10 px-4 py-2 text-[12px] font-medium text-white/55 transition-colors hover:border-brand/40 hover:text-white"
                }
              >
                {r === "All" ? "All roles" : r === "ADMIN" ? "Admins" : r + "s"}
              </button>
            ))}
          </div>

          <div className="mt-4 divide-y divide-white/6">
            {shown.map((u) => (
              <div key={u.id} className="flex flex-wrap items-center gap-4 py-4">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-display text-[12px] font-bold ring-1 ring-white/15 ${
                    u.role === "ADMIN" ? "bg-gradient-to-br from-amber-400/60 to-amber-300/30" : "bg-gradient-to-br from-brand/50 to-neon/40"
                  }`}
                >
                  {(u.name || u.email || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-[13.5px] font-semibold">
                    {u.name || "(no name)"}
                    {u.role === "ADMIN" && <Crown className="h-3.5 w-3.5 text-amber-300" />}
                  </p>
                  <p className="truncate text-[11.5px] text-white/40">
                    {u.email} · joined {new Date(u.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${ROLE_BADGE[u.role === "ADMIN" ? "ADMIN" : u.type]}`}>
                  {u.role === "ADMIN" ? "Admin" : u.type}
                </span>
                <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${u.isActive ? "border-mint/30 bg-mint/10 text-mint" : "border-red-500/40 bg-red-500/10 text-red-400"}`}>
                  {u.isActive ? "Active" : "Suspended"}
                </span>
                {u.id !== user?.id && u.role !== "ADMIN" && (
                  <button
                    onClick={() => toggleActive(u)}
                    className={
                      u.isActive
                        ? "inline-flex items-center gap-1.5 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-[11px] font-bold text-red-400 transition-all hover:bg-red-500 hover:text-white"
                        : "inline-flex items-center gap-1.5 rounded-lg border border-mint/40 bg-mint/10 px-3 py-1.5 text-[11px] font-bold text-mint transition-all hover:bg-mint hover:text-ink"
                    }
                  >
                    {u.isActive ? <Ban className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}
                    {u.isActive ? "Suspend" : "Restore"}
                  </button>
                )}
              </div>
            ))}
            {shown.length === 0 && (
              <p className="py-8 text-center text-[13px] text-white/35">No users match that search.</p>
            )}
          </div>
        </div>
      )}

      {/* ================= TRANSACTIONS ================= */}
      {!loading && tab === "transactions" && (
        <div className="glass mt-7 rounded-2xl p-6">
          <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-white/40">
            <Wallet className="h-3.5 w-3.5 text-mint" />
            Platform-wide transactions
          </p>
          <div className="mt-3 divide-y divide-white/6">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex flex-wrap items-center gap-4 py-4">
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-semibold">{tx.user?.name || tx.user?.email}</p>
                  <p className="mt-0.5 text-[11.5px] text-white/40">
                    {tx.provider} · {new Date(tx.createdAt).toLocaleString()}
                  </p>
                </div>
                <p className={`font-display text-[15px] font-bold ${["DEPOSIT", "ESCROW_RELEASE"].includes(tx.kind) ? "text-mint" : "text-white/70"}`}>
                  {["DEPOSIT", "ESCROW_RELEASE"].includes(tx.kind) ? "+" : "−"}${tx.amount.toLocaleString("en-US")}
                </p>
                <span className="rounded-full border border-white/10 px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-wider text-white/45">
                  {tx.kind.replace("_", " ")}
                </span>
                <span
                  className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
                    tx.status === "COMPLETED" ? "border-mint/30 bg-mint/10 text-mint" : "border-amber-400/30 bg-amber-400/10 text-amber-300"
                  }`}
                >
                  {tx.status}
                </span>
              </div>
            ))}
            {transactions.length === 0 && (
              <p className="py-8 text-center text-[13px] text-white/35">No transactions yet.</p>
            )}
          </div>
        </div>
      )}

      {/* ================= DISPUTES ================= */}
      {!loading && tab === "disputes" && (
        <div className="mt-7 space-y-3">
          {disputes.map((d) => {
            const { milestone } = d;
            const { contract } = milestone;
            const resolved = d.status === "RESOLVED";
            return (
              <div key={d.id} className="glass rounded-2xl p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2.5 text-[14.5px] font-semibold">
                      {contract.job?.title}
                      <span className="text-[10.5px] font-bold text-white/30">{milestone.title}</span>
                    </p>
                    <p className="mt-1 text-[12px] text-white/40">
                      {contract.client?.user?.name} ↔ {contract.freelancer?.user?.name} · ${milestone.amount.toLocaleString("en-US")} escrow-д · нээгдсэн {new Date(d.createdAt).toLocaleDateString()}
                    </p>
                    <p className="mt-2 text-[12.5px] text-white/60">"{d.reason}"</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider ${
                      resolved ? "border-mint/30 bg-mint/10 text-mint" : "border-amber-400/30 bg-amber-400/10 text-amber-300"
                    }`}
                  >
                    {resolved ? `Resolved · ${d.resolution}` : "Open"}
                  </span>
                </div>
                {!resolved && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => handleResolve(d.id, "FREELANCER")}
                      disabled={resolving}
                      className="rounded-lg border border-mint/40 bg-mint/10 px-3.5 py-2 text-[11.5px] font-bold text-mint transition-all hover:bg-mint hover:text-ink disabled:opacity-50"
                    >
                      Freelancer-д бүтнээр нь олгох
                    </button>
                    <button
                      onClick={() => handleResolve(d.id, "SPLIT")}
                      disabled={resolving}
                      className="rounded-lg border border-neon/40 bg-neon/10 px-3.5 py-2 text-[11.5px] font-bold text-neon transition-all hover:bg-neon hover:text-ink disabled:opacity-50"
                    >
                      Тэнцүү хуваах
                    </button>
                    <button
                      onClick={() => handleResolve(d.id, "CLIENT")}
                      disabled={resolving}
                      className="rounded-lg border border-brand/40 bg-brand/10 px-3.5 py-2 text-[11.5px] font-bold text-brand-soft transition-all hover:bg-brand hover:text-white disabled:opacity-50"
                    >
                      Client-д бүтнээр нь буцаах
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {disputes.length === 0 && (
            <div className="glass rounded-2xl p-10 text-center text-[13px] text-white/40">Одоогоор маргаан алга.</div>
          )}
        </div>
      )}
    </div>
  );
}
