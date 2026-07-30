import { useState } from "react";
import { Briefcase, FileText, CheckCircle2, Star, ArrowRight } from "lucide-react";
import { MY_PROJECTS } from "../../data/appMock.js";
import { useNav } from "../../nav.jsx";

const TABS = [
  { id: "active", label: "Active", Icon: Briefcase, count: MY_PROJECTS.active.length },
  { id: "proposals", label: "Proposals", Icon: FileText, count: MY_PROJECTS.proposals.length },
  { id: "completed", label: "Completed", Icon: CheckCircle2, count: MY_PROJECTS.completed.length },
];

const PROPOSAL_STATUS = {
  Shortlisted: "border-mint/30 bg-mint/10 text-mint",
  "Under review": "border-amber-400/30 bg-amber-400/10 text-amber-300",
};

export default function MyProjects() {
  const { nav } = useNav();
  const [tab, setTab] = useState("active");

  return (
    <div className="mx-auto max-w-4xl px-6 pb-24 pt-8">
      <h1 className="font-display text-3xl font-bold tracking-tight">My Projects</h1>
      <p className="mt-1.5 text-[13px] text-white/45">
        Everything you're working on, bidding for, and have shipped.
      </p>

      <div className="mt-7 flex gap-2">
        {TABS.map(({ id, label, Icon, count }) => (
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
            <span
              className={`flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1 text-[9.5px] font-bold ${
                tab === id ? "bg-white/20" : "bg-white/10 text-white/50"
              }`}
            >
              {count}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {tab === "active" &&
          MY_PROJECTS.active.map((p, i) => (
            <div
              key={p.title}
              className="glass animate-feed-in rounded-2xl p-6"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-display text-[16px] font-semibold">{p.title}</p>
                  <p className="mt-1 text-[12px] text-white/40">
                    {p.client} · {p.budget} · due {p.due}
                  </p>
                </div>
                <button
                  onClick={() => nav("tracker")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-neon/40 bg-neon/10 px-4 py-2 text-[12px] font-bold text-neon transition-all hover:bg-neon hover:text-ink"
                >
                  Open tracker
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/8">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-brand to-neon"
                    style={{ width: `${p.progress}%` }}
                  />
                </div>
                <span className="text-[11.5px] font-bold text-white/60">{p.progress}%</span>
              </div>
            </div>
          ))}

        {tab === "proposals" &&
          MY_PROJECTS.proposals.map((p, i) => (
            <div
              key={p.title}
              className="glass flex animate-feed-in flex-wrap items-center justify-between gap-3 rounded-2xl p-6"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div>
                <p className="font-display text-[16px] font-semibold">{p.title}</p>
                <p className="mt-1 text-[12px] text-white/40">
                  {p.client} · bid {p.bid} · sent {p.sent}
                </p>
              </div>
              <span
                className={`rounded-full border px-3.5 py-1.5 text-[10.5px] font-bold uppercase tracking-widest ${PROPOSAL_STATUS[p.status]}`}
              >
                {p.status}
              </span>
            </div>
          ))}

        {tab === "completed" &&
          MY_PROJECTS.completed.map((p, i) => (
            <div
              key={p.title}
              className="glass flex animate-feed-in flex-wrap items-center justify-between gap-3 rounded-2xl p-6"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div>
                <p className="font-display text-[16px] font-semibold">{p.title}</p>
                <p className="mt-1 text-[12px] text-white/40">
                  {p.client} · {p.date}
                </p>
              </div>
              <div className="text-right">
                <p className="font-display text-[15px] font-bold text-mint">{p.paid}</p>
                <p className="mt-0.5 inline-flex items-center gap-1 text-[12px] font-semibold text-amber-400">
                  <Star className="h-3.5 w-3.5 fill-amber-400" />
                  {p.rating.toFixed(1)}
                </p>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
