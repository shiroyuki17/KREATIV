import {
  GitCommitHorizontal,
  Upload,
  MessageSquare,
  CircleDollarSign,
  Briefcase,
  Bell,
  Radio,
} from "lucide-react";
import EmptyState from "../ui/EmptyState.jsx";
import { useT } from "../../i18n.jsx";

const META = {
  commit: { Icon: GitCommitHorizontal, cls: "text-brand-soft border-brand/30 bg-brand/10" },
  upload: { Icon: Upload, cls: "text-neon border-neon/30 bg-neon/10" },
  comment: { Icon: MessageSquare, cls: "text-white/60 border-white/15 bg-white/[0.05]" },
  message: { Icon: MessageSquare, cls: "text-neon border-neon/30 bg-neon/10" },
  payment: { Icon: CircleDollarSign, cls: "text-mint border-mint/30 bg-mint/10" },
  job: { Icon: Briefcase, cls: "text-brand-soft border-brand/30 bg-brand/10" },
};
const FALLBACK_META = { Icon: Bell, cls: "text-white/60 border-white/15 bg-white/[0.05]" };

/** Toast-style chronological feed with entrance animations. */
export default function ActivityFeed({ feed }) {
  const t = useT();
  return (
    <div className="glass flex h-full flex-col rounded-2xl p-6">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
          {t("af.liveActivity")}
        </p>
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-mint">
          <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-mint" />
          {t("af.streaming")}
        </span>
      </div>

      <div className="mt-4 space-y-2.5 overflow-hidden [mask-image:linear-gradient(to_bottom,black_82%,transparent)]">
        {feed.length === 0 && (
          <EmptyState
            Icon={Radio}
            title={t("af.empty")}
            desc={t("af.emptyDesc")}
            compact
          />
        )}
        {feed.map((e, i) => {
          const { Icon, cls } = META[e.type] || FALLBACK_META;
          return (
            <div
              key={`${e.text}-${i}`}
              className="flex animate-feed-in items-start gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-3"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${cls}`}>
                <Icon className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0">
                <p className="text-[12.5px] leading-snug text-white/80">{e.text}</p>
                <p className="mt-0.5 text-[10.5px] text-white/35">{e.time}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
