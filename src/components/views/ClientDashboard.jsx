import { Briefcase, ShieldCheck, Star, MessageSquare, ArrowRight, Plus, Search } from "lucide-react";
import ActivityFeed from "../dashboard/ActivityFeed.jsx";
import Magnet from "../fx/Magnet.jsx";
import { FEED_SEED } from "../../data/mock.js";
import { ACTIVE_PROJECTS, INVITES } from "../../data/appMock.js";
import { useNav } from "../../nav.jsx";

const STAT_CARDS = [
  { label: "Active projects", value: "3", Icon: Briefcase, cls: "text-brand-soft border-brand/30 bg-brand/10" },
  { label: "In escrow", value: "$6,400", Icon: ShieldCheck, cls: "text-mint border-mint/30 bg-mint/10" },
  { label: "Avg. rating given", value: "4.8", Icon: Star, cls: "text-amber-400 border-amber-400/30 bg-amber-400/10" },
  { label: "Unread messages", value: "5", Icon: MessageSquare, cls: "text-neon border-neon/30 bg-neon/10" },
];

export default function ClientDashboard() {
  const { nav } = useNav();

  return (
    <div className="mx-auto max-w-6xl px-6 pb-24 pt-8">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-soft">
            — Client workspace
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="font-display text-3xl font-bold tracking-tight">
              Welcome back, Ava
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/40 bg-brand/10 px-3.5 py-1.5 text-[10.5px] font-bold uppercase tracking-widest text-brand-soft shadow-[0_0_18px_rgba(0,211,149,0.2)]">
              <Briefcase className="h-3.5 w-3.5" />
              Client
            </span>
          </div>
          <p className="mt-1.5 text-[13px] text-white/45">
            3 projects in flight · 2 invites awaiting a reply
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
        {STAT_CARDS.map(({ label, value, Icon, cls }) => (
          <div key={label} className="glass rounded-2xl p-5">
            <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border ${cls}`}>
              <Icon className="h-4 w-4" />
            </span>
            <p className="mt-4 font-display text-2xl font-bold">{value}</p>
            <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-white/40">
              {label}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
                Active projects
              </p>
              <button
                onClick={() => nav("home")}
                className="text-[12px] font-medium text-brand-soft hover:text-white"
              >
                View all →
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {ACTIVE_PROJECTS.map((p) => (
                <div
                  key={p.title}
                  className="group cursor-pointer rounded-xl border border-white/8 bg-white/[0.03] p-4.5 transition-colors hover:border-brand/40"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[14px] font-semibold">{p.title}</p>
                      <p className="mt-0.5 text-[11.5px] text-white/40">
                        with {p.who} · {p.budget}
                      </p>
                    </div>
                    <span
                      className={
                        p.statusColor === "mint"
                          ? "rounded-full border border-mint/30 bg-mint/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-mint"
                          : "rounded-full border border-neon/30 bg-neon/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-neon"
                      }
                    >
                      {p.status}
                    </span>
                  </div>
                  <div className="mt-3.5 flex items-center gap-3">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/8">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand to-neon transition-all duration-700"
                        style={{ width: `${p.progress}%` }}
                      />
                    </div>
                    <span className="text-[11.5px] font-bold text-white/60">{p.progress}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass rounded-2xl p-6">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
              Project invites
            </p>
            <div className="mt-4 space-y-3">
              {INVITES.map((inv) => (
                <div
                  key={inv.title}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-4.5"
                >
                  <div>
                    <p className="text-[13.5px] font-semibold">{inv.title}</p>
                    <p className="mt-0.5 text-[11.5px] text-white/40">
                      {inv.client} · {inv.budget}
                    </p>
                  </div>
                  <Magnet strength={0.2}>
                    <button className="inline-flex items-center gap-1.5 rounded-lg border border-brand/40 bg-brand/15 px-4 py-2 text-[12px] font-semibold text-brand-soft transition-all hover:bg-brand hover:text-white">
                      Respond
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </Magnet>
                </div>
              ))}
            </div>
          </div>
        </div>

        <ActivityFeed feed={FEED_SEED} />
      </div>
    </div>
  );
}
