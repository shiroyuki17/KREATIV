import { useState } from "react";
import { CircleDollarSign, MessageSquare, Mail, Star, Info, CheckCheck } from "lucide-react";
import { NOTIFS } from "../../data/appMock.js";

const META = {
  payment: { Icon: CircleDollarSign, cls: "text-mint border-mint/30 bg-mint/10" },
  message: { Icon: MessageSquare, cls: "text-neon border-neon/30 bg-neon/10" },
  invite: { Icon: Mail, cls: "text-brand-soft border-brand/30 bg-brand/10" },
  review: { Icon: Star, cls: "text-amber-400 border-amber-400/30 bg-amber-400/10" },
  system: { Icon: Info, cls: "text-white/60 border-white/15 bg-white/[0.05]" },
};

export default function Notifications() {
  const [items, setItems] = useState(NOTIFS);
  const groups = ["Today", "Earlier"];
  const unread = items.filter((n) => n.unread).length;

  return (
    <div className="mx-auto max-w-3xl px-6 pb-24 pt-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="mt-1.5 text-[13px] text-white/45">
            {unread > 0 ? `${unread} unread` : "All caught up"}
          </p>
        </div>
        <button
          onClick={() => setItems((arr) => arr.map((n) => ({ ...n, unread: false })))}
          className="glass inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[12.5px] font-semibold text-white/70 transition-colors hover:border-mint/40 hover:text-mint"
        >
          <CheckCheck className="h-4 w-4" />
          Mark all read
        </button>
      </div>

      {groups.map((g) => (
        <div key={g} className="mt-8">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-white/35">{g}</p>
          <div className="mt-3 space-y-2.5">
            {items
              .filter((n) => n.group === g)
              .map((n, i) => {
                const { Icon, cls } = META[n.type];
                return (
                  <div
                    key={`${n.text}-${i}`}
                    className={`flex animate-feed-in items-start gap-3.5 rounded-xl border p-4 transition-colors ${
                      n.unread
                        ? "border-brand/25 bg-brand/[0.06] hover:border-brand/45"
                        : "border-white/8 bg-white/[0.02] hover:border-white/15"
                    }`}
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${cls}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] leading-snug text-white/85">{n.text}</p>
                      <p className="mt-1 text-[11px] text-white/35">{n.time}</p>
                    </div>
                    {n.unread && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand shadow-[0_0_8px_rgba(0,211,149,0.8)]" />
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}
