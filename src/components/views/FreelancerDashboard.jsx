import {
  TrendingUp,
  Briefcase,
  FileText,
  Eye,
  Sparkles,
  ArrowRight,
  CalendarClock,
  Star,
  Laptop,
} from "lucide-react";
import Magnet from "../fx/Magnet.jsx";
import { JOBS } from "../../data/mock.js";
import { EARNINGS, MY_PROJECTS } from "../../data/appMock.js";
import { useNav } from "../../nav.jsx";

const STAT_CARDS = [
  { label: "Earned this month", value: "$8,450", sub: "+12% vs June", Icon: TrendingUp, cls: "text-mint border-mint/30 bg-mint/10" },
  { label: "Active contracts", value: "2", sub: "next due Aug 04", Icon: Briefcase, cls: "text-brand-soft border-brand/30 bg-brand/10" },
  { label: "Pending proposals", value: "4", sub: "1 shortlisted", Icon: FileText, cls: "text-neon border-neon/30 bg-neon/10" },
  { label: "Profile views", value: "312", sub: "this week", Icon: Eye, cls: "text-amber-400 border-amber-400/30 bg-amber-400/10" },
];

const MATCHES = [
  { job: JOBS[3], match: 98 },
  { job: JOBS[1], match: 94 },
  { job: JOBS[5], match: 91 },
];

export default function FreelancerDashboard() {
  const { nav } = useNav();
  const max = Math.max(...EARNINGS.map((e) => e.v));

  return (
    <div className="mx-auto max-w-6xl px-6 pb-24 pt-8">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-soft">
            — Freelancer workspace
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="font-display text-3xl font-bold tracking-tight">
              Welcome back, Daniel
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-neon/40 bg-neon/10 px-3.5 py-1.5 text-[10.5px] font-bold uppercase tracking-widest text-neon shadow-[0_0_18px_rgba(6,182,212,0.2)]">
              <Laptop className="h-3.5 w-3.5" />
              Freelancer
            </span>
          </div>
          <p className="mt-1.5 text-[13px] text-white/45">
            2 contracts in flight · 3 new AI matches overnight
          </p>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {STAT_CARDS.map(({ label, value, sub, Icon, cls }) => (
          <div key={label} className="glass rounded-2xl p-5">
            <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border ${cls}`}>
              <Icon className="h-4 w-4" />
            </span>
            <p className="mt-4 font-display text-2xl font-bold">{value}</p>
            <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-white/40">
              {label}
            </p>
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
                AI-matched briefs for you
              </p>
              <button
                onClick={() => nav("home")}
                className="text-[12px] font-medium text-brand-soft hover:text-white"
              >
                Browse all →
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {MATCHES.map(({ job, match }) => (
                <div
                  key={job.id}
                  onClick={() => nav("project", job)}
                  className="group cursor-pointer rounded-xl border border-white/8 bg-white/[0.03] p-4.5 transition-colors hover:border-brand/40"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold">{job.title}</p>
                      <p className="mt-0.5 text-[11.5px] text-white/40">
                        {job.client} · {job.budget} · {job.type}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="rounded-full border border-brand/40 bg-brand/12 px-3 py-1.5 text-[11px] font-bold text-brand-soft shadow-[0_0_14px_rgba(0,211,149,0.25)]">
                        {match}% match
                      </span>
                      <ArrowRight className="h-4 w-4 text-white/30 transition-transform group-hover:translate-x-1 group-hover:text-brand-soft" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
                Active contracts
              </p>
              <button
                onClick={() => nav("my-projects")}
                className="text-[12px] font-medium text-brand-soft hover:text-white"
              >
                My projects →
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {MY_PROJECTS.active.map((p) => (
                <div
                  key={p.title}
                  className="rounded-xl border border-white/8 bg-white/[0.03] p-4.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[14px] font-semibold">{p.title}</p>
                      <p className="mt-0.5 text-[11.5px] text-white/40">
                        {p.client} · {p.budget} · due {p.due}
                      </p>
                    </div>
                    <button
                      onClick={() => nav("tracker")}
                      className="rounded-lg border border-neon/40 bg-neon/10 px-3.5 py-2 text-[11.5px] font-bold text-neon transition-all hover:bg-neon hover:text-ink"
                    >
                      Open tracker
                    </button>
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
        </div>

        <div className="space-y-5">
          <div className="glass rounded-2xl p-6">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
              Earnings · last 6 months
            </p>
            <div className="mt-5 flex h-36 items-end gap-2.5">
              {EARNINGS.map((e, i) => {
                const last = i === EARNINGS.length - 1;
                return (
                  <div key={e.m} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                    <div
                      title={`$${e.v.toLocaleString("en-US")}`}
                      className={
                        last
                          ? "w-full rounded-t-lg bg-gradient-to-t from-brand to-neon shadow-[0_0_18px_rgba(0,211,149,0.45)]"
                          : "w-full rounded-t-lg bg-white/12 transition-colors hover:bg-brand/40"
                      }
                      style={{ height: `${Math.round((e.v / max) * 100)}%` }}
                    />
                    <span className={`text-[10px] font-semibold ${last ? "text-brand-soft" : "text-white/35"}`}>
                      {e.m}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 border-t border-white/8 pt-4 text-[12px] text-white/45">
              Total: <b className="text-white">$38,850</b> · avg{" "}
              <b className="text-white">$6,475/mo</b>
            </p>
          </div>

          <div className="glass rounded-2xl p-6">
            <p className="inline-flex items-center gap-2 text-[12.5px] font-semibold text-white/75">
              <CalendarClock className="h-4 w-4 text-mint" />
              Next payout
            </p>
            <p className="mt-3 font-display text-2xl font-bold text-mint">$2,400</p>
            <p className="mt-1 text-[11.5px] text-white/40">
              Arrives Fri, Jul 25 → Visa •• 4821
            </p>
            <button
              onClick={() => nav("payments", { tab: "received" })}
              className="glass mt-4 w-full rounded-xl py-2.5 text-[12.5px] font-semibold text-white/75 transition-colors hover:border-white/25"
            >
              View received payments
            </button>
          </div>

          <div className="glass rounded-2xl p-6">
            <p className="inline-flex items-center gap-2 text-[12.5px] font-semibold text-white/75">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              Reputation
            </p>
            <p className="mt-3 font-display text-2xl font-bold">5.0</p>
            <p className="mt-1 text-[11.5px] text-white/40">
              94 reviews · Top Rated since 2023
            </p>
            <Magnet strength={0.15} className="mt-4 w-full">
              <button
                onClick={() => nav("profile")}
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
