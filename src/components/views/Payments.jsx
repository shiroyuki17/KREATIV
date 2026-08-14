import { useEffect, useState } from "react";
import {
  Wallet,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  X,
  QrCode,
  AlertCircle,
  Loader2,
  Check,
  Download,
} from "lucide-react";
import { useNav } from "../../nav.jsx";
import { useT } from "../../i18n.jsx";
import { getAccessToken } from "../../lib/authApi.js";
import { fetchBalance, fetchTransactions, createDeposit, confirmDeposit, withdraw, downloadTransactionsCsv } from "../../lib/paymentsApi.js";
import { fetchPaymentStatus } from "../../lib/billingApi.js";
import { useEscapeKey } from "../../hooks/useEscapeKey.js";

const ACCENT = {
  mint: "border-mint/30 bg-mint/10 text-mint",
  brand: "border-brand/30 bg-brand/10 text-brand-soft",
  neon: "border-neon/30 bg-neon/10 text-neon",
  amber: "border-amber-400/30 bg-amber-400/10 text-amber-300",
};

function DepositModal({ onClose, onDeposited, payStatus }) {
  const t = useT();
  const [amount, setAmount] = useState("100");
  const [invoice, setInvoice] = useState(null);
  const [busy, setBusy] = useState(false);
  const [settled, setSettled] = useState(false);
  const [error, setError] = useState("");
  useEscapeKey(onClose);

  const createInvoice = async () => {
    const token = getAccessToken();
    const n = parseInt(amount, 10);
    if (!Number.isFinite(n) || n <= 0) { setError(t("pay.amountInvalid")); return; }
    setBusy(true);
    setError("");
    try {
      const res = await createDeposit(n, token);
      // Stripe горимд төлбөр нь Stripe-ийн байршуулсан Checkout хуудсанд
      // хийгдэнэ — QR/poll байхгүй, шууд шилжинэ. Буцаж ирэхэд webhook
      // аль хэдийн үлдэгдлийг нэмсэн байна.
      if (res.checkoutUrl) { window.location.href = res.checkoutUrl; return; }
      setInvoice(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  // Хэрэглэгч өөрөө "Би төлсөн" гэж мэдэгдэх шаардлагагүй — QR гарсны дараа
  // систем өөрөө (демо горимд бага зэрэг хугацааны дараа, жинхэнэ QPay
  // холбогдсон бол payment/check-ээр) төлбөрийг илрүүлдэг мэт автоматаар
  // poll хийнэ. "settled: false" нь алдаа биш — зүгээр л "хараахан ирээгүй".
  useEffect(() => {
    if (!invoice || settled) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await confirmDeposit(invoice.transaction.id, getAccessToken());
        if (cancelled) return;
        if (res.settled) {
          setSettled(true);
          // Хэрэглэгчид "амжилттай" гэдгийг нэг мөч харуулаад, тэгээд л цонхыг хаана
          setTimeout(() => { if (!cancelled) onDeposited(res.balance, res.transaction); }, 900);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    };
    const t = setInterval(poll, 1200);
    return () => { cancelled = true; clearInterval(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoice, settled]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="deposit-modal-title" className="glass w-full max-w-sm rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p id="deposit-modal-title" className="text-[15px] font-bold">
            {t("pay.addFundsTitle")}
            {payStatus?.provider === "stripe" ? " · Stripe" : payStatus?.provider === "qpay" ? " · QPay" : " · Demo"}
          </p>
          <button onClick={onClose} aria-label={t("common.close")} className="rounded-lg p-1.5 text-white/50 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        {!invoice ? (
          <>
            {/* Ямар горимд ажиллаж байгааг ил хэлнэ — хэрэглэгч жинхэнэ
                мөнгө төлж байна уу үгүй юу гэдгээ мэдэх ёстой. */}
            <p className="mt-2 text-[12px] text-white/45">
              {payStatus?.provider === "stripe"
                ? (payStatus.testMode
                    ? t("pay.stripeTest")
                    : t("pay.stripeLive"))
                : payStatus?.provider === "qpay"
                  ? t("pay.qpayInfo")
                  : t("pay.demoInfo")}
            </p>
            <label className="mt-5 block text-[11px] font-semibold uppercase tracking-wider text-white/40">{t("pay.amountUsd")}</label>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[16px] font-bold outline-none focus:border-brand/50"
            />
            {error && (
              <p className="mt-3 flex items-center gap-1.5 text-[12px] font-medium text-red-400">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
              </p>
            )}
            <button
              onClick={createInvoice}
              disabled={busy}
              className="mt-5 w-full rounded-xl bg-brand py-3 text-[13.5px] font-bold text-fg-1 glow-brand transition-shadow disabled:opacity-50"
            >
              {busy ? t("pay.pleaseWait") : t("pay.createInvoice")}
            </button>
          </>
        ) : (
          <>
            <div className="mt-4 flex flex-col items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-6 text-center">
              {settled ? (
                <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-mint bg-mint/10 text-mint">
                  <Check className="h-8 w-8" />
                </span>
              ) : invoice.qrImage ? (
                <img src={`data:image/png;base64,${invoice.qrImage}`} alt="QPay QR" className="h-40 w-40 rounded-lg bg-white p-2" />
              ) : (
                <QrCode className="h-16 w-16 text-brand-soft" />
              )}
              <p className="font-mono text-[11px] text-white/50">{invoice.qpayInvoiceNo || invoice.transaction?.id}</p>
              <p className="font-display text-2xl font-bold">${Number(amount).toLocaleString("en-US")}</p>
              <p className={`text-[11px] ${settled ? "font-semibold text-mint" : "text-white/40"}`}>
                {settled
                  ? t("pay.paidOk")
                  : invoice.qrImage
                    ? t("pay.scanQr")
                    : t("pay.scanQrDemo")}
              </p>
            </div>
            {error && (
              <p className="mt-3 flex items-center gap-1.5 text-[12px] font-medium text-red-400">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
              </p>
            )}
            {!settled && (
              <p className="mt-5 flex items-center justify-center gap-2 text-[12.5px] font-medium text-white/50">
                <Loader2 className="h-4 w-4 animate-spin text-brand-soft" />
                {t("pay.waitingPayment")}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function WithdrawModal({ balance, minWithdrawal, onClose, onWithdrawn }) {
  const t = useT();
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEscapeKey(onClose);

  const submit = async () => {
    const n = parseInt(amount, 10);
    if (!Number.isFinite(n) || n <= 0) { setError(t("pay.amountInvalid")); return; }
    if (n < minWithdrawal) { setError(t("pay.minWithdrawal", { amount: minWithdrawal })); return; }
    setBusy(true);
    setError("");
    try {
      const res = await withdraw(n, getAccessToken());
      onWithdrawn(res.balance, res.transaction);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="withdraw-modal-title" className="glass w-full max-w-sm rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p id="withdraw-modal-title" className="text-[15px] font-bold">{t("pay.withdraw")}</p>
          <button onClick={onClose} aria-label={t("common.close")} className="rounded-lg p-1.5 text-white/50 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 text-[12px] text-white/45">{t("pay.available", { amount: balance.toLocaleString("en-US"), min: minWithdrawal })}</p>
        <p className="mt-1 text-[11px] text-white/35">{t("pay.withdrawNote")}</p>
        <label className="mt-5 block text-[11px] font-semibold uppercase tracking-wider text-white/40">{t("pay.amountUsd")}</label>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
          className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[16px] font-bold outline-none focus:border-brand/50"
        />
        {error && (
          <p className="mt-3 flex items-center gap-1.5 text-[12px] font-medium text-red-400">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
          </p>
        )}
        <button
          onClick={submit}
          disabled={busy}
          className="mt-5 w-full rounded-xl bg-mint py-3 text-[13.5px] font-bold text-ink transition-shadow disabled:opacity-50"
        >
          {busy ? t("pay.processing") : t("pay.requestWithdrawal")}
        </button>
      </div>
    </div>
  );
}

const STATUS_BADGE = {
  COMPLETED: ACCENT.mint,
  PENDING: ACCENT.amber,
  FAILED: "border-red-500/30 bg-red-500/10 text-red-400",
};

function TxRow({ tx }) {
  const t = useT();
  const isCredit = tx.kind === "DEPOSIT" || tx.kind === "ESCROW_RELEASE";
  const isPendingHold = tx.kind === "ESCROW_RELEASE" && tx.availableAt && new Date(tx.availableAt) > new Date();
  return (
    <div className="flex items-center gap-4 py-4">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${isCredit ? ACCENT.mint : "border-white/15 bg-white/[0.05] text-white/60"}`}>
        {isCredit ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-semibold">{t(`tx.${tx.kind}`)} · {tx.provider}</p>
        <p className="mt-0.5 text-[11.5px] text-white/40">
          {new Date(tx.createdAt).toLocaleString()}
          {isPendingHold && t("tx.availableFrom", { date: new Date(tx.availableAt).toLocaleDateString() })}
        </p>
      </div>
      <div className="text-right">
        <p className={`font-display text-[14.5px] font-bold ${isCredit ? "text-mint" : "text-white/70"}`}>
          {isCredit ? "+" : "−"}${tx.amount.toLocaleString("en-US")}
        </p>
        <span className={`mt-1 inline-block rounded-full border px-2.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider ${STATUS_BADGE[tx.status] || ACCENT.amber}`}>
          {tx.status === "COMPLETED" ? (isPendingHold ? t("tx.hold") : t("tx.completed")) : tx.status === "FAILED" ? t("tx.rejected") : t("tx.pending")}
        </span>
      </div>
    </div>
  );
}

const TABS = [
  { id: "overview", labelKey: "pay.tabOverview", Icon: Wallet },
  { id: "deposits", labelKey: "pay.tabDeposits", Icon: ArrowDownLeft },
  { id: "withdrawals", labelKey: "pay.tabWithdrawals", Icon: ArrowUpRight },
];

export default function Payments() {
  const t = useT();
  const { params } = useNav();
  const [tab, setTab] = useState(params?.tab || "overview");
  const [balance, setBalance] = useState(0);
  const [pending, setPending] = useState(0);
  const [minWithdrawal, setMinWithdrawal] = useState(50);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [exporting, setExporting] = useState(false);
  // Ямар провайдер идэвхтэй байгаа (stripe/qpay/demo) — DepositModal үүнийг
  // хэрэглэгчид ил хэлэхэд ашиглана.
  const [payStatus, setPayStatus] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchPaymentStatus()
      .then((st) => { if (!cancelled) setPayStatus(st); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (params?.tab) setTab(params.tab);
  }, [params]);

  const loadWallet = () => {
    const token = getAccessToken();
    if (!token) { setLoading(false); return; }
    setLoading(true);
    Promise.all([fetchBalance(token), fetchTransactions(token)])
      .then(([b, t]) => {
        setBalance(b.balance);
        setPending(b.pending || 0);
        setMinWithdrawal(b.minWithdrawal || 50);
        setTransactions(t.transactions);
      })
      .finally(() => setLoading(false));
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      await downloadTransactionsCsv(getAccessToken());
    } finally {
      setExporting(false);
    }
  };

  useEffect(loadWallet, []);

  const deposits = transactions.filter((t) => t.kind === "DEPOSIT");
  const withdrawals = transactions.filter((t) => t.kind === "WITHDRAWAL");
  const totalDeposited = deposits.filter((t) => t.status === "COMPLETED").reduce((s, t) => s + t.amount, 0);
  const totalWithdrawn = withdrawals.filter((t) => t.status === "COMPLETED").reduce((s, t) => s + t.amount, 0);

  return (
    <div className="mx-auto max-w-6xl px-6 pb-24 pt-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">{t("pay.title")}</h1>
          <p className="mt-1.5 text-[13px] text-white/45">{t("pay.subtitle")}</p>
        </div>
        {/* Мөнгө нэмэх/татах нь хуудасны түвшний үйлдэл тул үлдэгдлийн картын
            булангаас гаргаж энд авчирсан — карт зөвхөн тоогоо харуулна. */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Хажуугийн хоёр товч хүрээ/дэвсгэртэй атал энэ нь зөвхөн бүдэг
              (fg-3) текст байсан тул товч мэт огт харагддаггүй байв —
              Withdraw-тай ижил outline хэв маягт оруулав. */}
          <button
            onClick={exportCsv}
            disabled={exporting}
            title={t("pay.exportTitle")}
            className="inline-flex items-center gap-2 rounded-xl border border-line-2 px-4 py-2.5 text-[12.5px] font-semibold text-fg-2 transition-colors hover:border-brand hover:text-fg-1 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            {exporting ? t("pay.exporting") : t("pay.exportCsv")}
          </button>
          <button
            onClick={() => setShowWithdraw(true)}
            disabled={balance <= 0}
            title={balance <= 0 ? t("pay.noBalanceToWithdraw") : undefined}
            className="rounded-xl border border-line-2 px-4 py-2.5 text-[12.5px] font-semibold text-fg-2 transition-colors hover:border-brand hover:text-fg-1 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-line-2 disabled:hover:text-fg-2"
          >
            {t("pay.withdraw")}
          </button>
          <button
            onClick={() => setShowDeposit(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-[12.5px] font-bold text-fg-1 transition-colors hover:bg-brand-soft"
          >
            <Wallet className="h-4 w-4" />
            {t("pay.addFunds")}
          </button>
        </div>
      </div>

      <div className="mt-7 flex gap-2">
        {TABS.map(({ id, labelKey, Icon }) => (
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
            {t(labelKey)}
          </button>
        ))}
      </div>

      {loading && <p className="mt-8 text-center text-[13px] text-white/40">{t("common.loading")}</p>}

      {!loading && tab === "overview" && (
        <>
          <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="glass rounded-2xl p-6">
              <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border ${ACCENT.mint}`}>
                <Wallet className="h-4.5 w-4.5" />
              </span>
              <p className="mt-5 font-display text-3xl font-bold">${balance.toLocaleString("en-US")}</p>
              <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-white/40">{t("pay.availableBalance")}</p>
            </div>
            <div className="glass rounded-2xl p-6">
              <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border ${ACCENT.amber}`}>
                <TrendingUp className="h-4.5 w-4.5" />
              </span>
              <p className="mt-5 font-display text-3xl font-bold">${pending.toLocaleString("en-US")}</p>
              <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-white/40">{t("pay.pendingHold")}</p>
            </div>
            <div className="glass rounded-2xl p-6">
              <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border ${ACCENT.brand}`}>
                <TrendingUp className="h-4.5 w-4.5" />
              </span>
              <p className="mt-5 font-display text-3xl font-bold">${totalDeposited.toLocaleString("en-US")}</p>
              <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-white/40">{t("pay.totalDeposited")}</p>
            </div>
            <div className="glass rounded-2xl p-6">
              <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border ${ACCENT.neon}`}>
                <TrendingDown className="h-4.5 w-4.5" />
              </span>
              <p className="mt-5 font-display text-3xl font-bold">${totalWithdrawn.toLocaleString("en-US")}</p>
              <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-white/40">{t("pay.totalWithdrawn")}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-3">
            <div className="glass min-w-0 rounded-2xl p-6 lg:col-span-2">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-white/40">{t("pay.recentTx")}</p>
              <div className="mt-3 divide-y divide-white/6">
                {transactions.slice(0, 8).map((tx) => <TxRow key={tx.id} tx={tx} />)}
                {transactions.length === 0 && (
                  <p className="py-8 text-center text-[13px] text-white/35">{t("pay.noTx")}</p>
                )}
              </div>
            </div>

            <div className="space-y-5">
              {/* Өмнө нь энд "No payout method on file yet" + "Add a method"
                  гэсэн карт байсан: систем нь payout method гэж юу ч
                  хадгалдаггүй (гаргалтыг админ гараар боловсруулдаг) тул
                  товч нь юу ч хийдэггүй, бичиг нь ч бодит биш байв. Оронд нь
                  бодит урсгалыг тайлбарлаж, ажилладаг товч тавьсан. */}
              <div className="glass rounded-2xl p-6">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-white/40">{t("pay.payouts")}</p>
                <div className="mt-4 space-y-2.5">
                  {[
                    t("pay.step1"),
                    t("pay.step2"),
                    t("pay.step3"),
                  ].map((step, i) => (
                    <div key={step} className="flex items-start gap-2.5">
                      <span className="mt-px flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-brand/15 text-[9.5px] font-bold text-brand-soft">
                        {i + 1}
                      </span>
                      <p className="text-[12px] leading-relaxed text-white/55">{step}</p>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setShowWithdraw(true)}
                  disabled={balance < minWithdrawal}
                  className="glass mt-4 w-full rounded-xl py-2.5 text-[12.5px] font-semibold text-white/75 transition-colors hover:border-white/25 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {balance < minWithdrawal ? t("pay.minAmount", { amount: minWithdrawal }) : t("pay.withdraw")}
                </button>
              </div>

              <div className="glass rounded-2xl p-6">
                <p className="inline-flex items-center gap-2 text-[12.5px] font-semibold text-mint">
                  <ShieldCheck className="h-4 w-4" />
                  {payStatus?.provider === "stripe"
                    ? (payStatus.testMode ? t("pay.stripeActiveTest") : t("pay.stripeActive"))
                    : payStatus?.provider === "qpay"
                      ? t("pay.qpayActive")
                      : t("pay.demoActive")}
                </p>
                <p className="mt-2 text-[12px] leading-relaxed text-white/45">
                  {payStatus?.provider === "stripe"
                    ? (payStatus.testMode
                        ? t("pay.stripeTestDesc")
                        : t("pay.stripeLiveDesc"))
                    : payStatus?.provider === "qpay"
                      ? t("pay.qpayDesc")
                      : t("pay.demoDesc")}
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {!loading && tab === "deposits" && (
        <div className="mt-7">
          <div className="glass rounded-2xl px-6 divide-y divide-white/6">
            {deposits.map((tx) => <TxRow key={tx.id} tx={tx} />)}
            {deposits.length === 0 && (
              <p className="py-8 text-center text-[13px] text-white/35">{t("pay.noDeposits")}</p>
            )}
          </div>
        </div>
      )}

      {!loading && tab === "withdrawals" && (
        <div className="mt-7">
          <div className="glass rounded-2xl px-6 divide-y divide-white/6">
            {withdrawals.map((tx) => <TxRow key={tx.id} tx={tx} />)}
            {withdrawals.length === 0 && (
              <p className="py-8 text-center text-[13px] text-white/35">{t("pay.noWithdrawals")}</p>
            )}
          </div>
        </div>
      )}

      {showDeposit && (
        <DepositModal
          payStatus={payStatus}
          onClose={() => setShowDeposit(false)}
          onDeposited={(newBalance, tx) => {
            setBalance(newBalance);
            setTransactions((list) => [tx, ...list]);
            setShowDeposit(false);
          }}
        />
      )}

      {showWithdraw && (
        <WithdrawModal
          balance={balance}
          minWithdrawal={minWithdrawal}
          onClose={() => setShowWithdraw(false)}
          onWithdrawn={(newBalance, tx) => {
            setBalance(newBalance);
            setTransactions((list) => [tx, ...list]);
            setShowWithdraw(false);
          }}
        />
      )}
    </div>
  );
}
