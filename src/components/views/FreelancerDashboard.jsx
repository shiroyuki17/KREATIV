import { useEffect, useState } from "react";
import {
  TrendingUp,
  Briefcase,
  Star,
  Sparkles,
  ArrowRight,
  Wallet,
  Laptop,
  UserRoundPlus,
} from "lucide-react";
import Magnet from "../fx/Magnet.jsx";
import EmptyState from "../ui/EmptyState.jsx";
import { useNav } from "../../nav.jsx";
import { getAccessToken, fetchFreelancerProfile } from "../../lib/authApi.js";
import { fetchBalance, fetchTransactions } from "../../lib/paymentsApi.js";
import { fetchJobs } from "../../lib/jobsApi.js";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function last6MonthsBuckets(transactions) {
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth(), label: MONTH_LABELS[d.getMonth()] });
  }
  return months.map(({ year, month, label }) => ({
    m: label,
    v: transactions
      .filter((t) => t.kind === "DEPOSIT" && t.status === "COMPLETED")
      .filter((t) => { const d = new Date(t.createdAt); return d.getFullYear() === year && d.getMonth() === month; })
      .reduce((s, t) => s + t.amount, 0),
  }));
}

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function FreelancerDashboard() {
  const { nav, user } = useNav();
  const firstName = user?.name?.split(" ")[0] || user?.email?.split("@")[0] || "there";

  const [profile, setProfile] = useState(null);
  const [balance, setBalance] = useState(0);
  const [earnings, setEarnings] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) { setLoading(false); return; }
    Promise.all([
      fetchFreelancerProfile(token).catch(() => null),
      fetchBalance(token).catch(() => ({ balance: 0 })),
      fetchTransactions(token).catch(() => ({ transactions: [] })),
    ]).then(([p, b, t]) => {
      setProfile(p);
      setBalance(b.balance);
      setEarnings(last6MonthsBuckets(t.transactions));
      if (p?.category) {
        fetchJobs({ category: p.category, pageSize: 3 }).then((res) => setMatches(res.jobs)).catch(() => {});
      }
    }).finally(() => setLoading(false));
  }, []);

  const max = Math.max(1, ...earnings.map((e) => e.v));
  const monthTotal = earnings.reduce((s, e) => s + e.v, 0);

  return (
    <div className="mx-auto max-w-6xl px-6 pb-24 pt-8">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-soft">
            — Freelancer workspace
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="font-display text-3xl font-bold tracking-tight">
              Welcome back, {firstName}
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-neon/40 bg-neon/10 px-3.5 py-1.5 text-[10.5px] font-bold uppercase tracking-widest text-neon shadow-[0_0_18px_rgba(6,182,212,0.2)]">
              <Laptop className="h-3.5 w-3.5" />
              Freelancer
            </span>
          </div>
          <p className="mt-1.5 text-[13px] text-white/45">
            {profile ? `${profile.category || "General"} · ${profile.skills?.length || 0} skills listed` : "Complete your profile to appear in Find Talent"}
          </p>
        </div>
      </div>

      {!loading && !profile && (
        <div className="mt-7 flex flex-wrap items-center gap-4 rounded-2xl border border-brand/25 bg-brand/[0.06] p-5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-brand/30 bg-brand/10 text-brand-soft">
            <UserRoundPlus className="h-5 w-5" />
          </span>
          <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-white/70">
            <b className="text-white">Set up your freelancer profile</b> to appear in Find Talent and get matched to briefs in your category.
          </p>
          <button
            onClick={() => nav("settings")}
            className="shrink-0 rounded-lg bg-gradient-to-r from-brand to-brand-soft px-4 py-2.5 text-[12.5px] font-bold text-ink glow-brand transition-shadow hover:shadow-[0_0_30px_rgba(0,211,149,0.5)]"
          >
            Set up profile
          </button>
        </div>
      )}

      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Available balance", value: `$${balance.toLocaleString("en-US")}`, sub: "in your wallet", Icon: Wallet, cls: "text-mint border-mint/30 bg-mint/10" },
          { label: "Jobs completed", value: profile?.jobsCompleted ?? 0, sub: "all time", Icon: Briefcase, cls: "text-brand-soft border-brand/30 bg-brand/10" },
          { label: "Rating", value: profile?.ratingAvg ? profile.ratingAvg.toFixed(1) : "—", sub: profile?.ratingAvg ? "average" : "no reviews yet", Icon: Star, cls: "text-amber-400 border-amber-400/30 bg-amber-400/10" },
          { label: "Live matches", value: matches.length, sub: `in ${profile?.category || "your"} category`, Icon: Sparkles, cls: "text-neon border-neon/30 bg-neon/10" },
        ].map(({ label, value, sub, Icon, cls }) => (
          <div key={label} className="glass rounded-2xl p-5">
            <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border ${cls}`}>
              <Icon className="h-4 w-4" />
            </span>
            <p className="mt-4 font-display text-2xl font-bold">{value}</p>
            <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-white/40">{label}</p>
            <p className="mt-1 text-[11px] text-white/30">{sub}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-white/40">
                <Sparkles className="h-3.5 w-3.5 text-brand-soft" />
                Live briefs matching your category
              </p>
              <button
                onClick={() => nav("find-work")}
                className="text-[12px] font-medium text-brand-soft hover:text-white"
              >
                Browse all →
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {matches.map((job) => (
                <div
                  key={job.id}
                  onClick={() => nav("project", job)}
                  className="group cursor-pointer rounded-xl border border-white/8 bg-white/[0.03] p-4.5 transition-colors hover:border-brand/40"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold">{job.title}</p>
                      <p className="mt-0.5 text-[11.5px] text-white/40">
                        {job.client?.name || job.client?.orgName || "Client"} ·{" "}
                        {job.budgetMin ? `$${job.budgetMin.toLocaleString("en-US")}${job.budgetType === "HOURLY" ? "/hr" : ""}` : "—"} · {timeAgo(job.createdAt)}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-white/30 transition-transform group-hover:translate-x-1 group-hover:text-brand-soft" />
                  </div>
                </div>
              ))}
              {!loading && matches.length === 0 && (
                <EmptyState
                  Icon={Sparkles}
                  compact
                  title={profile ? "No open briefs in your category right now" : "No matches yet"}
                  desc={profile ? "Check back soon, or browse everything that's open." : "Set up your profile to start seeing briefs matched to your skills."}
                  actionLabel={profile ? "Browse all briefs" : undefined}
                  onAction={() => nav("find-work")}
                />
              )}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="glass rounded-2xl p-6">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
              Deposits · last 6 months
            </p>
            <div className="mt-5 flex h-36 items-end gap-2.5">
              {earnings.map((e, i) => {
                const last = i === earnings.length - 1;
                return (
                  <div key={e.m} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                    <div
                      title={`$${e.v.toLocaleString("en-US")}`}
                      className={
                        last
                          ? "w-full rounded-t-lg bg-gradient-to-t from-brand to-neon shadow-[0_0_18px_rgba(0,211,149,0.45)]"
                          : "w-full rounded-t-lg bg-white/12 transition-colors hover:bg-brand/40"
                      }
                      style={{ height: `${Math.max(3, Math.round((e.v / max) * 100))}%` }}
                    />
                    <span className={`text-[10px] font-semibold ${last ? "text-brand-soft" : "text-white/35"}`}>
                      {e.m}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 border-t border-white/8 pt-4 text-[12px] text-white/45">
              Total: <b className="text-white">${monthTotal.toLocaleString("en-US")}</b>
            </p>
          </div>

          <div className="glass rounded-2xl p-6">
            <p className="inline-flex items-center gap-2 text-[12.5px] font-semibold text-white/75">
              <TrendingUp className="h-4 w-4 text-mint" />
              Wallet
            </p>
            <p className="mt-3 font-display text-2xl font-bold text-mint">${balance.toLocaleString("en-US")}</p>
            <p className="mt-1 text-[11.5px] text-white/40">Available to withdraw</p>
            <button
              onClick={() => nav("payments")}
              className="glass mt-4 w-full rounded-xl py-2.5 text-[12.5px] font-semibold text-white/75 transition-colors hover:border-white/25"
            >
              Manage payments
            </button>
          </div>

          <div className="glass rounded-2xl p-6">
            <p className="inline-flex items-center gap-2 text-[12.5px] font-semibold text-white/75">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              Reputation
            </p>
            <p className="mt-3 font-display text-2xl font-bold">{profile?.ratingAvg ? profile.ratingAvg.toFixed(1) : "—"}</p>
            <p className="mt-1 text-[11.5px] text-white/40">
              {profile?.jobsCompleted ? `${profile.jobsCompleted} jobs completed` : "No jobs completed yet"}
            </p>
            <Magnet strength={0.15} className="mt-4 w-full">
              <button
                onClick={() => nav("profile", { userId: user?.id })}
                className="w-full rounded-xl bg-gradient-to-r from-brand to-brand-soft py-2.5 text-[12.5px] font-semibold glow-brand transition-shadow hover:shadow-[0_0_36px_rgba(0,211,149,0.55)]"
              >
                View public profile
              </button>
            </Magnet>
          </div>
        </div>
      </div>
    </div>
  );
}
