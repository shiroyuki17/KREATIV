import { useEffect, useState } from "react";
import { Briefcase, FileText, Inbox, AlertCircle, Star, Check, Scale, LayoutGrid, ChevronDown, ArrowRight } from "lucide-react";
import { useNav } from "../../nav.jsx";
import { getAccessToken, fetchFreelancerProfile, fetchClientProfile } from "../../lib/authApi.js";
import { fetchMyJobs } from "../../lib/jobsApi.js";
import {
  fetchMyProposals,
  fetchJobProposals,
  acceptProposal,
  fetchMyContracts,
  fundMilestone,
  deliverMilestone,
  approveMilestone,
  requestRevision,
  openDispute,
  submitReview,
} from "../../lib/contractApi.js";
import KanbanBoard from "../dashboard/KanbanBoard.jsx";
import TimeTracker from "../dashboard/TimeTracker.jsx";

const MILESTONE_BADGE = {
  PENDING_FUNDING: "border-white/15 bg-white/[0.05] text-white/50",
  FUNDED: "border-brand/30 bg-brand/10 text-brand-soft",
  DELIVERED: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  APPROVED: "border-mint/30 bg-mint/10 text-mint",
  DISPUTED: "border-red-500/40 bg-red-500/10 text-red-400",
};

// Төлөв бүрд ХОЁУЛАА юу болж байгааг, хэний ээлж болохыг энгийн үгээр
// хэлнэ. Өмнө нь товч нь зөвхөн ээлжтэй талд гардаг, нөгөө тал нь
// "PENDING_FUNDING" гэсэн хуурай enum badge-аас өөр юу ч харахгүй тул
// хүлээж байгаа юу, эсвэл өөрөөс нь ямар нэг зүйл хүлээж байна уу гэдгээ
// мэдэхгүй байв.
const NEXT_STEP = {
  PENDING_FUNDING: {
    client: "Escrow-д мөнгө байршуулснаар гүйцэтгэгч ажлаа эхэлнэ.",
    freelancer: "Захиалагч escrow-д мөнгө байршуулахыг хүлээж байна. Байршуулмагц эхэлнэ.",
  },
  FUNDED: {
    client: "Мөнгө escrow-д хамгаалагдсан. Гүйцэтгэгч ажиллаж байна — хүлээлгэн өгөхийг хүлээнэ.",
    freelancer: "Мөнгө escrow-д баталгаажсан. Ажлаа эхлүүлж, дуусмагц “Хүлээлгэн өгөх” дар.",
  },
  DELIVERED: {
    client: "Ажил хүлээлгэн өгсөн — шалгаад батлах, эсвэл засвар хүсэх боломжтой.",
    freelancer: "Хүлээлгэн өгсөн. Захиалагчийн баталгааг хүлээж байна.",
  },
  APPROVED: {
    client: "Батлагдсан — төлбөр гүйцэтгэгчид шилжсэн.",
    freelancer: "Батлагдсан — төлбөр таны үлдэгдэлд шилжсэн.",
  },
  DISPUTED: {
    client: "Маргаан нээгдсэн — админ шалгаж шийдвэрлэнэ.",
    freelancer: "Маргаан нээгдсэн — админ шалгаж шийдвэрлэнэ.",
  },
};

const PROPOSAL_BADGE = {
  PENDING: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  ACCEPTED: "border-mint/30 bg-mint/10 text-mint",
  REJECTED: "border-red-500/40 bg-red-500/10 text-red-400",
  WITHDRAWN: "border-white/15 bg-white/[0.05] text-white/50",
};

function DeliverForm({ onSubmit, busy }) {
  const [note, setNote] = useState("");
  const [link, setLink] = useState("");
  return (
    <div className="mt-3 space-y-2 rounded-xl border border-white/8 bg-white/[0.03] p-3.5">
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Юу хийснээ товч бичнэ үү…"
        rows={2}
        className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[12.5px] outline-none placeholder:text-white/30 focus:border-brand/50"
      />
      <input
        value={link}
        onChange={(e) => setLink(e.target.value)}
        placeholder="Линк (заавал биш) — https://…"
        className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[12.5px] outline-none placeholder:text-white/30 focus:border-brand/50"
      />
      <button
        onClick={() => onSubmit({ note, link: link || undefined })}
        disabled={busy}
        className="rounded-lg bg-brand px-3.5 py-2 text-[11.5px] font-bold text-fg-1 glow-brand disabled:opacity-50"
      >
        Хүлээлгэн өгөх
      </button>
    </div>
  );
}

function DisputeForm({ onSubmit, onCancel, busy }) {
  const [reason, setReason] = useState("");
  return (
    <div className="mt-3 space-y-2 rounded-xl border border-red-500/20 bg-red-500/[0.04] p-3.5">
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Маргааны шалтгаанаа тайлбарлана уу (дор хаяж 10 тэмдэгт)…"
        rows={2}
        className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[12.5px] outline-none placeholder:text-white/30 focus:border-red-500/50"
      />
      <div className="flex gap-2">
        <button
          onClick={() => onSubmit(reason)}
          disabled={busy || reason.trim().length < 10}
          className="rounded-lg border border-red-500/40 bg-red-500/10 px-3.5 py-2 text-[11.5px] font-bold text-red-400 transition-all hover:bg-red-500 hover:text-white disabled:opacity-50"
        >
          Маргаан нээх
        </button>
        <button onClick={onCancel} className="rounded-lg px-3.5 py-2 text-[11.5px] font-semibold text-white/50 hover:text-white">
          Цуцлах
        </button>
      </div>
    </div>
  );
}

function ReviewForm({ onSubmit, busy, done }) {
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");
  if (done) {
    return <p className="mt-3 text-[12px] font-semibold text-mint">Үнэлгээ илгээгдлээ, баярлалаа!</p>;
  }
  return (
    <div className="mt-3 space-y-2 rounded-xl border border-white/8 bg-white/[0.03] p-3.5">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => setStars(n)} aria-label={`${n} od`}>
            <Star className={`h-5 w-5 ${n <= stars ? "fill-amber-400 text-amber-400" : "text-white/20"}`} />
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Сэтгэгдэл (заавал биш)…"
        rows={2}
        className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[12.5px] outline-none placeholder:text-white/30 focus:border-brand/50"
      />
      <button
        onClick={() => onSubmit({ stars, comment: comment || undefined })}
        disabled={busy}
        className="rounded-lg bg-brand px-3.5 py-2 text-[11.5px] font-bold text-fg-1 glow-brand disabled:opacity-50"
      >
        Үнэлгээ илгээх
      </button>
    </div>
  );
}

function MilestoneCard({ milestone: m, myRole, revisionLimit, onFund, onDeliver, onApprove, onRequestRevision, onDispute, busy }) {
  const [showDeliver, setShowDeliver] = useState(false);
  const [showDispute, setShowDispute] = useState(false);
  const revisionsLeft = revisionLimit - (m.revisionsUsed || 0);

  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[13.5px] font-semibold">{m.title}</p>
          <p className="mt-0.5 text-[11.5px] text-white/40">
            ${m.amount.toLocaleString("en-US")}
            {m.revisionsUsed > 0 && ` · ${m.revisionsUsed}/${revisionLimit} засвар хэрэглэсэн`}
          </p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${MILESTONE_BADGE[m.status]}`}>
          {m.status.replace("_", " ")}
        </span>
      </div>

      {NEXT_STEP[m.status]?.[myRole] && (
        <p className="mt-2.5 flex items-start gap-1.5 text-[12px] leading-relaxed text-white/50">
          <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-soft" />
          {NEXT_STEP[m.status][myRole]}
        </p>
      )}

      {m.deliveryNote && (
        <p className="mt-2.5 rounded-lg border border-white/8 bg-white/[0.03] p-2.5 text-[12px] text-white/60">
          {m.deliveryNote}
          {m.deliveryLink && (
            <a href={m.deliveryLink} target="_blank" rel="noopener noreferrer" className="ml-2 text-brand-soft hover:text-white">
              линк →
            </a>
          )}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {myRole === "client" && m.status === "PENDING_FUNDING" && (
          <button onClick={() => onFund(m.id)} disabled={busy} className="rounded-lg border border-brand/40 bg-brand/10 px-3.5 py-1.5 text-[11.5px] font-bold text-brand-soft transition-all hover:bg-brand hover:text-fg-1 disabled:opacity-50">
            Escrow-д санхүүжүүлэх
          </button>
        )}
        {myRole === "freelancer" && m.status === "FUNDED" && !showDeliver && (
          <button onClick={() => setShowDeliver(true)} className="rounded-lg border border-brand/40 bg-brand/10 px-3.5 py-1.5 text-[11.5px] font-bold text-brand-soft transition-all hover:bg-brand hover:text-fg-1">
            Хүлээлгэн өгөх
          </button>
        )}
        {myRole === "client" && m.status === "DELIVERED" && (
          <>
            <button onClick={() => onApprove(m.id)} disabled={busy} className="rounded-lg border border-mint/40 bg-mint/10 px-3.5 py-1.5 text-[11.5px] font-bold text-mint transition-all hover:bg-mint hover:text-ink disabled:opacity-50">
              Батлах
            </button>
            {revisionsLeft > 0 ? (
              <button onClick={() => onRequestRevision(m.id)} disabled={busy} className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-3.5 py-1.5 text-[11.5px] font-bold text-amber-300 transition-all hover:bg-amber-400 hover:text-ink disabled:opacity-50">
                Засвар хүсэх ({revisionsLeft} үлдсэн)
              </button>
            ) : (
              <span className="rounded-lg border border-white/10 px-3.5 py-1.5 text-[11.5px] font-semibold text-white/35">
                Засварын хязгаар дүүрсэн — батлах эсвэл маргаан нээх
              </span>
            )}
          </>
        )}
        {["FUNDED", "DELIVERED"].includes(m.status) && !showDispute && (
          <button onClick={() => setShowDispute(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3.5 py-1.5 text-[11.5px] font-semibold text-white/50 transition-colors hover:border-red-500/40 hover:text-red-400">
            <Scale className="h-3.5 w-3.5" /> Маргаан нээх
          </button>
        )}
      </div>

      {showDeliver && <DeliverForm busy={busy} onSubmit={(data) => { onDeliver(m.id, data); setShowDeliver(false); }} />}
      {showDispute && <DisputeForm busy={busy} onCancel={() => setShowDispute(false)} onSubmit={(reason) => { onDispute(m.id, reason); setShowDispute(false); }} />}
    </div>
  );
}

export default function MyProjects() {
  const { nav, user } = useNav();
  const [tab, setTab] = useState("contracts");
  const [isFreelancer, setIsFreelancer] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [myProposals, setMyProposals] = useState([]);
  const [jobProposals, setJobProposals] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Ажлын явц (Kanban board) шууд харагдаж байхыг хvссэн тул анхнаасаа
  // НЭЭЛТТЭЙ — хэрэглэгч бүрэн хаасан контрактуудыг л энд хадгална
  // (нээлттэй байдал бол өгөгдмөл, хаасан нь тэмдэглэгдсэн зүйл).
  const [closedWorkspace, setClosedWorkspace] = useState(() => new Set());
  const toggleWorkspace = (id) =>
    setClosedWorkspace((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const [busy, setBusy] = useState(false);
  const [reviewedContracts, setReviewedContracts] = useState([]);

  const load = () => {
    const token = getAccessToken();
    if (!token) { setLoading(false); return; }
    setLoading(true);
    Promise.all([
      fetchFreelancerProfile(token).catch(() => null),
      fetchClientProfile(token).catch(() => null),
      fetchMyContracts(token).catch(() => ({ contracts: [] })),
    ])
      .then(async ([fp, cp, contractsRes]) => {
        setIsFreelancer(!!fp);
        setIsClient(!!cp);
        setContracts(contractsRes.contracts);

        if (fp) {
          const mp = await fetchMyProposals(token).catch(() => ({ proposals: [] }));
          setMyProposals(mp.proposals);
        }
        if (cp) {
          const jobsRes = await fetchMyJobs(token).catch(() => ({ jobs: [] }));
          const openJobs = jobsRes.jobs.filter((j) => j.status === "OPEN");
          const lists = await Promise.all(
            openJobs.map((j) =>
              fetchJobProposals(j.id, token)
                .then((r) => r.proposals.filter((p) => p.status === "PENDING").map((p) => ({ ...p, jobTitle: j.title })))
                .catch(() => [])
            )
          );
          setJobProposals(lists.flat());
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const withBusy = async (fn) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleAccept = (proposalId) => withBusy(() => acceptProposal(proposalId, null, getAccessToken()));
  const handleFund = (milestoneId) => withBusy(() => fundMilestone(milestoneId, getAccessToken()));
  const handleDeliver = (milestoneId, data) => withBusy(() => deliverMilestone(milestoneId, data, getAccessToken()));
  const handleApprove = (milestoneId) => withBusy(() => approveMilestone(milestoneId, getAccessToken()));
  const handleRequestRevision = (milestoneId) => withBusy(() => requestRevision(milestoneId, undefined, getAccessToken()));
  const handleDispute = (milestoneId, reason) => withBusy(() => openDispute(milestoneId, reason, getAccessToken()));
  const handleReview = (contractId, data) =>
    withBusy(async () => {
      await submitReview(contractId, data, getAccessToken());
      setReviewedContracts((list) => [...list, contractId]);
    });

  const TABS = [
    { id: "contracts", label: "Contracts", Icon: Briefcase, count: contracts.length },
    ...(isFreelancer ? [{ id: "proposals", label: "My Proposals", Icon: FileText, count: myProposals.length }] : []),
    ...(isClient ? [{ id: "inbox", label: "Proposals received", Icon: Inbox, count: jobProposals.length }] : []),
  ];

  return (
    <div className="mx-auto max-w-4xl px-6 pb-24 pt-8">
      <h1 className="font-display text-3xl font-bold tracking-tight">My Projects</h1>
      <p className="mt-1.5 text-[13px] text-white/45">
        Санал, гэрээ, milestone — бодит urьтэй холбогдсон бүх зүйл.
      </p>

      {error && (
        <p className="mt-4 flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-[12.5px] font-medium text-red-400">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
        </p>
      )}

      <div className="mt-7 flex flex-wrap gap-2">
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
            <span className={`flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1 text-[9.5px] font-bold ${tab === id ? "bg-white/20" : "bg-white/10 text-white/50"}`}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {loading && <p className="mt-8 text-center text-[13px] text-white/40">Ачааллаж байна…</p>}

      {!loading && tab === "contracts" && (
        <div className="mt-6 space-y-4">
          {contracts.map((c) => {
            const myRole = c.freelancer?.id === user?.id ? "freelancer" : "client";
            const otherParty = myRole === "freelancer" ? c.client?.orgName || c.client?.name : c.freelancer?.name;
            return (
              <div key={c.id} className="glass animate-feed-in rounded-2xl p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-display text-[16px] font-semibold">{c.job?.title}</p>
                    <p className="mt-1 text-[12px] text-white/40">
                      {myRole === "freelancer" ? "Client" : "Freelancer"}: {otherParty} · ${c.totalAmount.toLocaleString("en-US")} · {c.commissionPct}% комисс
                    </p>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${c.status === "COMPLETED" ? "border-mint/30 bg-mint/10 text-mint" : "border-neon/30 bg-neon/10 text-neon"}`}>
                    {c.status}
                  </span>
                </div>

                {/* Ажлын явц — хэдэн milestone АПРОВЕД болсныг тоогоор бус,
                    нэг харцаар харагдах progress bar-аар харуулна. */}
                {c.milestones.length > 0 && (() => {
                  const done = c.milestones.filter((m) => m.status === "APPROVED").length;
                  const pct = Math.round((done / c.milestones.length) * 100);
                  return (
                    <div className="mt-3.5">
                      <div className="flex items-center justify-between text-[11px] text-white/45">
                        <span>Явц</span>
                        <span className="font-semibold text-white/70">{done}/{c.milestones.length} milestone · {pct}%</span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/8">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-brand to-neon transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })()}

                <div className="mt-4 space-y-2.5">
                  {c.milestones.map((m) => (
                    <MilestoneCard
                      key={m.id}
                      milestone={m}
                      myRole={myRole}
                      revisionLimit={c.revisionLimit}
                      busy={busy}
                      onFund={handleFund}
                      onDeliver={handleDeliver}
                      onApprove={handleApprove}
                      onRequestRevision={handleRequestRevision}
                      onDispute={handleDispute}
                    />
                  ))}
                </div>

                <button
                  onClick={() => toggleWorkspace(c.id)}
                  className="mt-4 flex w-full items-center justify-between rounded-xl border border-white/8 bg-white/[0.02] px-4 py-2.5 text-[12.5px] font-semibold text-white/70 transition-colors hover:border-white/20 hover:text-white"
                >
                  <span className="inline-flex items-center gap-2">
                    <LayoutGrid className="h-3.5 w-3.5 text-brand-soft" />
                    Workspace · Kanban board
                  </span>
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${!closedWorkspace.has(c.id) ? "rotate-180" : ""}`} />
                </button>
                {!closedWorkspace.has(c.id) && (
                  <div className="mt-3 space-y-3">
                    <KanbanBoard contractId={c.id} />
                    {/* Бодит цаг бүртгэл — сервер эхлэл/төгсгөлийг хадгална.
                        Зөвхөн гүйцэтгэгч бүртгэж чадна, захиалагч харна. */}
                    <TimeTracker contractId={c.id} />
                  </div>
                )}

                {c.status === "COMPLETED" && (
                  <ReviewForm busy={busy} done={reviewedContracts.includes(c.id)} onSubmit={(data) => handleReview(c.id, data)} />
                )}
              </div>
            );
          })}
          {contracts.length === 0 && (
            <div className="glass rounded-2xl p-10 text-center text-[13px] text-white/40">
              Одоогоор гэрээ байхгүй байна. {isFreelancer && "Жинхэнэ ажил дээр санал илгээгээд эхэл."}
            </div>
          )}
        </div>
      )}

      {!loading && tab === "proposals" && (
        <div className="mt-6 space-y-3">
          {myProposals.map((p) => (
            <div key={p.id} className="glass flex animate-feed-in flex-wrap items-center justify-between gap-3 rounded-2xl p-6">
              <div>
                <p className="font-display text-[16px] font-semibold">{p.job.title}</p>
                <p className="mt-1 text-[12px] text-white/40">
                  {p.job.clientName} · ${p.price.toLocaleString("en-US")} санал
                </p>
              </div>
              <span className={`rounded-full border px-3.5 py-1.5 text-[10.5px] font-bold uppercase tracking-widest ${PROPOSAL_BADGE[p.status]}`}>
                {p.status}
              </span>
            </div>
          ))}
          {myProposals.length === 0 && (
            <div className="glass rounded-2xl p-10 text-center text-[13px] text-white/40">
              Санал илгээгээгүй байна — Find Work-оос ажил олж санал явуулаарай.
            </div>
          )}
        </div>
      )}

      {!loading && tab === "inbox" && (
        <div className="mt-6 space-y-3">
          {jobProposals.map((p) => (
            <div key={p.id} className="glass animate-feed-in rounded-2xl p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-display text-[15px] font-semibold">{p.jobTitle}</p>
                  <p className="mt-1 text-[12.5px] text-white/50">
                    {p.freelancer?.name} · {p.freelancer?.headline} · {p.freelancer?.ratingAvg > 0 ? `${p.freelancer.ratingAvg.toFixed(1)}★` : "шинэ"}
                  </p>
                  <p className="mt-2 text-[13px] text-white/65">{p.coverLetter}</p>
                </div>
                <p className="shrink-0 font-display text-[18px] font-bold text-mint">${p.price.toLocaleString("en-US")}</p>
              </div>
              <div className="mt-3 flex gap-2">
                <button onClick={() => handleAccept(p.id)} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg border border-mint/40 bg-mint/10 px-3.5 py-1.5 text-[11.5px] font-bold text-mint transition-all hover:bg-mint hover:text-ink disabled:opacity-50">
                  <Check className="h-3.5 w-3.5" /> Зөвшөөрөх
                </button>
                <button onClick={() => nav("messages", { withUserId: p.freelancer?.userId })} className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3.5 py-1.5 text-[11.5px] font-semibold text-white/60 transition-colors hover:text-white">
                  Чатлах
                </button>
              </div>
            </div>
          ))}
          {jobProposals.length === 0 && (
            <div className="glass rounded-2xl p-10 text-center text-[13px] text-white/40">
              Одоогоор шинэ санал ирээгүй байна.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
