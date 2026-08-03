import { useState } from "react";
import { BadgeCheck } from "lucide-react";
import BlurText from "../fx/BlurText.jsx";
import MilestoneStepper from "./MilestoneStepper.jsx";
import TimeTracker from "./TimeTracker.jsx";
import DeliverableHub from "./DeliverableHub.jsx";
import ActivityFeed from "./ActivityFeed.jsx";
import { FEED_SEED, MILESTONES } from "../../data/mock.js";

/** The full "Active Project Tracker" suite — stepper, timer, deliverables, feed. */
export default function ProjectProgressDashboard() {
  const [stage, setStage] = useState(1);
  const [feed, setFeed] = useState(FEED_SEED);

  const push = (entry) => setFeed((f) => [{ ...entry, time: "just now" }, ...f].slice(0, 6));

  const approve = () => {
    if (stage >= MILESTONES.length - 1) return;
    const next = stage + 1;
    setStage(next);
    push({
      type: "payment",
      text: `“${MILESTONES[stage].label}” approved — ${MILESTONES[stage].amount} released from escrow`,
    });
  };

  const revision = () =>
    push({ type: "comment", text: "Revision requested on Phase 1 deliverables" });

  const completed = stage >= MILESTONES.length - 1;

  return (
    <section id="dashboard" className="relative py-12 md:py-24">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-[-140px] top-1/3 h-[420px] w-[420px] rounded-full bg-neon/8 blur-[130px]"
      />
      <div className="relative mx-auto max-w-6xl px-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-soft">
          — Radical transparency
        </p>
        <h2 className="mt-3 max-w-xl font-display text-[clamp(1.9rem,3.6vw,2.8rem)] font-bold text-brand text-glow leading-tight tracking-tight">
          <BlurText text="Track every milestone. Release payment in one click." />
        </h2>

        <div className="glass mt-12 rounded-3xl border-white/10 p-5 md:p-7">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-display text-xl font-bold">Checkout flow revamp</p>
              <p className="mt-1 inline-flex items-center gap-1.5 text-[12.5px] text-white/45">
                Nova Studio
                <BadgeCheck className="h-4 w-4 text-neon" />
                · with Daniel Kim
              </p>
            </div>
            <span
              className={
                completed
                  ? "rounded-full border border-mint/40 bg-mint/10 px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-mint glow-mint"
                  : "rounded-full border border-neon/30 bg-neon/10 px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-neon"
              }
            >
              {completed ? "Project complete" : `Milestone ${stage + 1} of ${MILESTONES.length}`}
            </span>
          </div>

          <div className="overflow-x-auto pb-2">
            <div className="min-w-[560px]">
              <MilestoneStepper stage={stage} />
            </div>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <DeliverableHub
                onApprove={approve}
                onRevision={revision}
                approved={completed}
              />
            </div>
            <div className="flex flex-col gap-5">
              <TimeTracker />
              <div className="min-h-0 flex-1">
                <ActivityFeed feed={feed} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
