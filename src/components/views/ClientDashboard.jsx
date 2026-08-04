import { useEffect, useState } from "react";
import { Briefcase, Wallet, Star, MessageSquare, Plus, Search, FolderOpen } from "lucide-react";
import ActivityFeed from "../dashboard/ActivityFeed.jsx";
import EmptyState from "../ui/EmptyState.jsx";
import { useNav } from "../../nav.jsx";
import { useLive } from "../../live.jsx";
import { getAccessToken, fetchClientProfile } from "../../lib/authApi.js";
import { fetchMyJobs } from "../../lib/jobsApi.js";
import { fetchBalance } from "../../lib/paymentsApi.js";
import { fetchNotifications } from "../../lib/notificationsApi.js";

// Full class strings, not built from interpolated color names — Tailwind's
// build-time scanner can't see dynamically-constructed class names, so
// `border-${color}/30` would silently produce no CSS at all.
const STATUS_BADGE = {
  OPEN: "border-mint/30 bg-mint/10 text-mint",
  IN_PROGRESS: "border-neon/30 bg-neon/10 text-neon",
  CLOSED: "border-brand/30 bg-brand/10 text-brand-soft",
  CANCELLED: "border-white/15 bg-white/[0.05] text-white/50",
};

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function ClientDashboard() {
  const { nav, user } = useNav();
  const { unread } = useLive();
  const firstName = user?.name?.split(" ")[0] || user?.email?.split("@")[0] || "there";

  const [profile, setProfile] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [balance, setBalance] = useState(0);
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) { setLoading(false); return; }
    Promise.all([
      fetchClientProfile(token).catch(() => null),
      fetchMyJobs(token).catch(() => ({ jobs: [] })),
      fetchBalance(token).catch(() => ({ balance: 0 })),
      fetchNotifications(token).catch(() => ({ notifications: [] })),
    ]).then(([p, j, b, n]) => {
      setProfile(p);
      setJobs(j.jobs);
      setBalance(b.balance);
      setFeed(n.notifications.slice(0, 8).map((x) => ({ type: x.type, text: x.text, time: timeAgo(x.createdAt) })));
    }).finally(() => setLoading(false));
  }, []);

  const openJobsCount = jobs.filter((j) => j.status === "OPEN").length;

  return (
    <div className="mx-auto max-w-6xl px-6 pb-24 pt-8">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-soft">
            — Client workspace
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="font-display text-3xl font-bold tracking-tight">
              Welcome back, {firstName}
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/40 bg-brand/10 px-3.5 py-1.5 text-[10.5px] font-bold uppercase tracking-widest text-brand-soft shadow-[0_0_18px_rgba(0,211,149,0.2)]">
              <Briefcase className="h-3.5 w-3.5" />
              Client
            </span>
          </div>
          <p className="mt-1.5 text-[13px] text-white/45">
            {profile?.orgName ? `${profile.orgName} · ` : ""}{jobs.length} job{jobs.length === 1 ? "" : "s"} posted · {openJobsCount} open
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => nav("post-job")}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand to-brand-soft px-5 py-3 text-[13px] font-semibold glow-brand transition-shadow hover:shadow-[0_0_40px_rgba(0,211,149,0.6)]"
          >
            <Plus className="h-4 w-4" />
            Post a Job
          </button>
          <button
            onClick={() => nav("find-talent")}
            className="glass inline-flex items-center gap-2 rounded-xl px-5 py-3 text-[13px] font-semibold text-white/85 transition-colors hover:border-white/25"
          >
            <Search className="h-4 w-4" />
            Find Talent
          </button>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Jobs posted", value: jobs.length, Icon: Briefcase, cls: "text-brand-soft border-brand/30 bg-brand/10" },
          { label: "Open jobs", value: openJobsCount, Icon: Briefcase, cls: "text-mint border-mint/30 bg-mint/10" },
          { label: "Wallet balance", value: `$${balance.toLocaleString("en-US")}`, Icon: Wallet, cls: "text-amber-400 border-amber-400/30 bg-amber-400/10" },
          { label: "Unread messages", value: unread.messages, Icon: MessageSquare, cls: "text-neon border-neon/30 bg-neon/10" },
        ].map(({ label, value, Icon, cls }) => (
          <div key={label} className="glass rounded-2xl p-5">
            <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border ${cls}`}>
              <Icon className="h-4 w-4" />
            </span>
            <p className="mt-4 font-display text-2xl font-bold">{value}</p>
            <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-white/40">{label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
                Your posted jobs
              </p>
              <button
                onClick={() => nav("my-projects")}
                className="text-[12px] font-medium text-brand-soft hover:text-white"
              >
                View all →
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {jobs.slice(0, 6).map((j) => (
                <div
                  key={j.id}
                  onClick={() => nav("project", j)}
                  className="group cursor-pointer rounded-xl border border-white/8 bg-white/[0.03] p-4.5 transition-colors hover:border-brand/40"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold">{j.title}</p>
                      <p className="mt-0.5 text-[11.5px] text-white/40">
                        {j.category} · {j.budgetMin ? `$${j.budgetMin.toLocaleString("en-US")}${j.budgetType === "HOURLY" ? "/hr" : ""}` : "—"}
                      </p>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${STATUS_BADGE[j.status]}`}>
                      {j.status.replace("_", " ")}
                    </span>
                  </div>
                </div>
              ))}
              {!loading && jobs.length === 0 && (
                <EmptyState
                  Icon={FolderOpen}
                  title="No jobs posted yet"
                  desc="Post a brief and start receiving proposals from vetted specialists within hours."
                  actionLabel="Post your first job"
                  onAction={() => nav("post-job")}
                />
              )}
            </div>
          </div>
        </div>

        <ActivityFeed feed={feed} />
      </div>
    </div>
  );
}
