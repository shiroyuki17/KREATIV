import { useEffect, useState } from "react";
import {
  Wallet,
  ShieldCheck,
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  BadgeCheck,
  Briefcase,
  Clock,
} from "lucide-react";
import { TRANSACTIONS, RECEIVED, SENT } from "../../data/appMock.js";
import { useNav } from "../../nav.jsx";

const TABS = [
  { id: "overview", label: "Overview", Icon: Wallet },
  { id: "received", label: "Received", Icon: ArrowDownLeft },
  { id: "sent", label: "Sent", Icon: ArrowUpRight },
];

const ACCENT = {
  mint: "border-mint/30 bg-mint/10 text-mint",
  brand: "border-brand/30 bg-brand/10 text-brand-soft",
  neon: "border-neon/30 bg-neon/10 text-neon",
  amber: "border-amber-400/30 bg-amber-400/10 text-amber-300",
};

const STATUS = {
  Completed: ACCENT.mint,
  Cleared: ACCENT.mint,
  Released: ACCENT.mint,
  "In escrow": ACCENT.brand,
  Funded: ACCENT.brand,
  Pending: ACCENT.amber,
  Clearing: ACCENT.amber,
  Processing: ACCENT.amber,
};

function StatCard({ Icon, accent, value, label, sub }) {
  return (
    <div className="glass rounded-2xl p-5">
      <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border ${ACCENT[accent]}`}>
        <Icon className="h-4 w-4" />
      </span>
      <p className="mt-4 font-display text-2xl font-bold">{value}</p>
      <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-white/40">{label}</p>
      {sub && <p className="mt-1 text-[11px] text-white/30">{sub}</p>}
    </div>
  );
}

function MonthLedger({ groups, dir }) {
  return (
    <div className="space-y-7">
      {groups.map((g) => (
        <div key={g.month}>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-white/35">
            {g.month}
          </p>
          <div className="glass mt-3 divide-y divide-white/6 rounded-2xl px-6">
            {g.items.map((it, i) => (
              <div key={i} className="flex animate-feed-in items-center gap-4 py-4" style={{ animationDelay: `${i * 50}ms` }}>
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                    it.kind.includes("deposit") ? ACCENT.brand : dir === "in" ? ACCENT.mint : "border-white/15 bg-white/[0.05] text-white/60"
                  }`}
                >
                  {dir === "in" ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-semibold">{it.project}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-white/40">
                    {dir === "in" ? <>from {it.from} <BadgeCheck className="h-3 w-3 text-neon" /></> : <>to {it.to}</>}
                    · {it.kind} · {it.date}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={`font-display text-[14.5px] font-bold ${
                      dir === "in" ? "text-mint" : it.kind.includes("deposit") ? "text-brand-soft" : "text-white/70"
                    }`}
                  >
                    {it.amount}
                  </p>
                  <span className={`mt-1 inline-block rounded-full border px-2.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider ${STATUS[it.status]}`}>
                    {it.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Payments() {
  const { params } = useNav();
  const [tab, setTab] = useState(params?.tab || "overview");

  useEffect(() => {
    if (params?.tab) setTab(params.tab);
  }, [params]);

  return (
    <div className="mx-auto max-w-6xl px-6 pb-24 pt-8">
      <h1 className="font-display text-3xl font-bold tracking-tight">Payments</h1>
      <p className="mt-1.5 text-[13px] text-white/45">
        Every transaction is escrow-protected and instantly traceable.
      </p>

      <div className="mt-7 flex gap-2">
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

      {tab === "overview" && (
        <>
          <div className="mt-7 grid gap-4 md:grid-cols-3">
            <div className="glass rounded-2xl p-6">
              <div className="flex items-start justify-between">
                <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border ${ACCENT.mint}`}>
                  <Wallet className="h-4.5 w-4.5" />
                </span>
                <button className="rounded-lg border border-mint/40 bg-mint/10 px-3.5 py-1.5 text-[11.5px] font-bold text-mint transition-all hover:bg-mint hover:text-ink">
                  Withdraw
                </button>
              </div>
              <p className="mt-5 font-display text-3xl font-bold">$4,250</p>
              <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-white/40">
                Available balance
              </p>
            </div>
            <div className="glass rounded-2xl p-6">
              <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border ${ACCENT.brand}`}>
                <ShieldCheck className="h-4.5 w-4.5" />
              </span>
              <p className="mt-5 font-display text-3xl font-bold">$6,400</p>
              <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-white/40">
                In escrow
              </p>
            </div>
            <div className="glass rounded-2xl p-6">
              <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border ${ACCENT.neon}`}>
                <TrendingUp className="h-4.5 w-4.5" />
              </span>
              <p className="mt-5 font-display text-3xl font-bold">$86,200</p>
              <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-white/40">
                Lifetime earned
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-3">
            <div className="glass min-w-0 rounded-2xl p-6 lg:col-span-2">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
                Recent transactions
              </p>
              <div className="mt-3 divide-y divide-white/6">
                {TRANSACTIONS.map((tx) => (
                  <div key={tx.id} className="flex items-center gap-4 py-4">
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                        tx.dir === "in" ? ACCENT.mint : tx.dir === "escrow" ? ACCENT.brand : "border-white/15 bg-white/[0.05] text-white/60"
                      }`}
                    >
                      {tx.dir === "out" ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-semibold">{tx.desc}</p>
                      <p className="mt-0.5 text-[11.5px] text-white/40">
                        {tx.party} · {tx.date} · {tx.id}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-display text-[14.5px] font-bold ${
                          tx.dir === "in" ? "text-mint" : tx.dir === "out" ? "text-white/70" : "text-brand-soft"
                        }`}
                      >
                        {tx.amount}
                      </p>
                      <span className={`mt-1 inline-block rounded-full border px-2.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider ${STATUS[tx.status]}`}>
                        {tx.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-5">
              <div className="glass rounded-2xl p-6">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
                  Payout method
                </p>
                <div className="mt-4 rounded-xl border border-white/10 bg-gradient-to-br from-brand/25 via-white/[0.03] to-neon/15 p-5">
                  <div className="flex items-center justify-between">
                    <CreditCard className="h-5 w-5 text-white/70" />
                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-widest text-white/60">
                      Default
                    </span>
                  </div>
                  <p className="mt-6 font-display text-[15px] font-bold tracking-widest">
                    Visa •••• 4821
                  </p>
                  <p className="mt-1 text-[11px] text-white/40">Next payout: Fri, Jul 25</p>
                </div>
                <button className="glass mt-4 w-full rounded-xl py-2.5 text-[12.5px] font-semibold text-white/75 transition-colors hover:border-white/25">
                  Manage methods
                </button>
              </div>

              <div className="glass rounded-2xl p-6">
                <p className="inline-flex items-center gap-2 text-[12.5px] font-semibold text-mint">
                  <ShieldCheck className="h-4 w-4" />
                  Escrow protection active
                </p>
                <p className="mt-2 text-[12px] leading-relaxed text-white/45">
                  Funds are held securely until you approve each milestone.
                  Disputes are resolved by a human within 48 hours.
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {tab === "received" && (
        <>
          <div className="mt-7 grid grid-cols-2 gap-4 md:grid-cols-3">
            <StatCard Icon={ArrowDownLeft} accent="mint" value="+$5,650" label="Received this month" sub="3 milestone releases" />
            <StatCard Icon={Clock} accent="amber" value="$1,800" label="Clearing" sub="arrives in ~24h" />
            <StatCard Icon={Briefcase} accent="brand" value="Nova Studio" label="Top client" sub="$12,400 lifetime" />
          </div>
          <div className="mt-7">
            <MonthLedger groups={RECEIVED} dir="in" />
          </div>
          <p className="mt-6 text-center text-[12px] text-white/35">
            Total received in 2026: <b className="text-mint">$38,850</b> · all escrow-verified
          </p>
        </>
      )}

      {tab === "sent" && (
        <>
          <div className="mt-7 grid grid-cols-2 gap-4 md:grid-cols-3">
            <StatCard Icon={ArrowUpRight} accent="neon" value="−$7,400" label="Sent this month" sub="2 payments · 1 withdrawal" />
            <StatCard Icon={ShieldCheck} accent="brand" value="$6,400" label="Sitting in escrow" sub="2 contracts funded" />
            <StatCard Icon={Briefcase} accent="mint" value="3" label="Freelancers paid" sub="this quarter" />
          </div>
          <div className="mt-7">
            <MonthLedger groups={SENT} dir="out" />
          </div>
          <p className="mt-6 text-center text-[12px] text-white/35">
            Pro plan commission: <b className="text-brand-soft">5%</b> · applied at milestone release
          </p>
        </>
      )}
    </div>
  );
}
