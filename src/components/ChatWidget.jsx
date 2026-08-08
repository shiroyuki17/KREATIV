import { useEffect, useRef, useState } from "react";
import { Sparkles, Send, X, ShieldCheck } from "lucide-react";
import { useNav } from "../nav.jsx";
import { API_BASE } from "../lib/authApi.js";

const GREETING = {
  from: "bot",
  text: "Hi! I'm KREATIV AI. I can find you talent, explain fees, help if a payment issue comes up, or answer with live platform stats. What do you need?",
};

const QUICK = [
  "A client hasn't paid me",
  "How does escrow work?",
  "What are the fees?",
  "How many freelancers do you have?",
];

// Rule-based (regex), not an LLM — but this one branch answers with a real,
// live number pulled from the backend instead of canned text, so it's an
// honest "yes" to "can it answer things actually on the site".
const DYNAMIC_RULES = [
  {
    re: /(how many|stats|statistic|freelancer count|нийт хэд|хэдэн (freelancer|client|ажил|зар))/i,
    run: async () => {
      const res = await fetch(`${API_BASE}/analytics/public`);
      if (!res.ok) throw new Error("stats unavailable");
      const s = await res.json();
      return `Right now, live from our database: ${s.freelancers} freelancers, ${s.clients} clients, ${s.jobs} jobs posted (${s.openJobs} currently open). Not a canned number — that's a real query.`;
    },
  },
];

const RULES = [
  {
    re: /(scam|fraud|cheat|not paid|hasn'?t paid|didn'?t pay|no pay|won'?t pay|stole|missing money)/i,
    text: "I'm sorry that happened — this is exactly what our protections are for. On KREATIV, work never starts until the client's money is locked in escrow, so the funds already exist. Open a dispute from your project tracker: a human specialist reviews the evidence and releases your money within 48 hours. Want me to take you to the Trust & Safety page?",
    action: "trust",
  },
  {
    re: /(escrow|protect|safe|secure|guarantee)/i,
    text: "Escrow means the client deposits the full milestone amount before work begins. The money is locked — neither side can touch it — and releases instantly when the milestone is approved. If there's a disagreement, a human resolves it within 48h. That's why non-payment scams can't happen here.",
    action: "trust",
  },
  {
    re: /(fee|commission|price|cost|charge|plan)/i,
    text: "Simple: Starter is free with a 10% escrow commission. Pro is $29/mo with just 5% commission, unlimited proposals, and AI matchmaking. Enterprise drops to 2%. No hidden fees — commission only applies when you actually get paid.",
  },
  {
    re: /(find|hire|match|need a|looking for|developer|designer|freelancer|talent)/i,
    text: "On it! Based on briefs like yours, I'd shortlist Daniel Kim (5.0★, $95/hr, React/Node) as the top fit — 98% match. You can browse all vetted talent on the job board, or post a brief and I'll match you in ~3.2 hours.",
  },
  {
    re: /(dispute|refund|problem|issue|help)/i,
    text: "If anything goes wrong: open a dispute from the project tracker. The contract freezes instantly, both sides submit evidence within 24h, and a human specialist decides within 48h — funds are then released or refunded. 99.2% of disputes are resolved fairly.",
    action: "trust",
  },
];

const FALLBACK = {
  text: "I can help with finding talent, escrow & payment protection, fees, disputes, or live platform stats. Try one of the quick questions below, or describe your project and I'll find matches!",
};

// Dynamic rules hit a real endpoint first (if it fails, we fall through to
// the static keyword rules instead of showing an error).
async function reply(input) {
  for (const r of DYNAMIC_RULES) {
    if (r.re.test(input)) {
      try {
        return { text: await r.run(input) };
      } catch {
        break;
      }
    }
  }
  for (const r of RULES) if (r.re.test(input)) return r;
  return FALLBACK;
}

// Module-level, not state — persists for the whole page load. null = not
// checked yet, false = backend confirmed "not configured" (or unreachable),
// so we stop retrying it for the rest of the session and just use the
// rule-based reply() above. This is the same demo/real-fallback pattern as
// QPay and Google OAuth: real LLM the moment ANTHROPIC_API_KEY is set on the
// backend, silent fallback to the rule-based bot until then.
let aiAvailable = null;

async function getReply(history, latest) {
  if (aiAvailable !== false) {
    try {
      const apiMessages = [...history, { from: "user", text: latest }]
        .slice(-10)
        .map((m) => ({ role: m.from === "user" ? "user" : "assistant", content: m.text }));
      const res = await fetch(`${API_BASE}/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      });
      if (res.ok) {
        aiAvailable = true;
        const data = await res.json();
        return { text: data.text };
      }
      if (res.status === 503) aiAvailable = false;
    } catch {
      // network error — fall through to the rule-based reply for this
      // message, but leave aiAvailable alone in case it was a one-off blip
    }
  }
  return reply(latest);
}

export default function ChatWidget() {
  const { nav } = useNav();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([GREETING]);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const [action, setAction] = useState(null);
  const bodyRef = useRef(null);

  useEffect(() => {
    const openIt = () => setOpen(true);
    window.addEventListener("open-kreativ-chat", openIt);
    return () => window.removeEventListener("open-kreativ-chat", openIt);
  }, []);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [msgs, typing, open]);

  const send = (text) => {
    const t = (text ?? draft).trim();
    if (!t || typing) return;
    setDraft("");
    setAction(null);
    const history = msgs;
    setMsgs((m) => [...m, { from: "user", text: t }]);
    setTyping(true);
    const askedAt = Date.now();
    getReply(history, t).then((r) => {
      // Keep the natural "thinking" pause even when a live fetch resolves fast
      const wait = Math.max(0, 900 - (Date.now() - askedAt));
      setTimeout(() => {
        setMsgs((m) => [...m, { from: "bot", text: r.text }]);
        if (r.action) setAction(r.action);
        setTyping(false);
      }, wait);
    });
  };

  return (
    <>
      {/* Launcher — mobile-д AppShell-ийн доод tab bar-тай давхцахаас
          сэргийлж bottom-24, tab bar байхгүй desktop дээр bottom-6 */}
      <button
        onClick={() => setOpen(!open)}
        aria-label={open ? "Close AI assistant" : "Open AI assistant"}
        className="fixed bottom-24 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-brand glow-brand transition-all hover:scale-105 lg:bottom-6"
      >
        {open ? <X className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
        {!open && (
          <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 animate-pulse-soft rounded-full border-2 border-ink bg-mint" />
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="glass fixed bottom-[168px] right-6 z-50 flex w-[min(370px,calc(100vw-3rem))] animate-feed-in flex-col overflow-hidden rounded-3xl shadow-[0_24px_70px_rgba(0,0,0,0.55)] lg:bottom-24">
          <div className="relative flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-brand/15 via-neon/10 to-transparent p-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-ink glow-brand">
                <Sparkles className="h-4.5 w-4.5" />
              </span>
              <div>
                <p className="font-display text-[14px] font-bold tracking-wide text-white">KREATIV AI</p>
                <p className="text-[10.5px] text-brand-soft">● Online & Ready</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/60 transition-colors hover:border-white/20 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div ref={bodyRef} className="max-h-[340px] flex-1 space-y-3 overflow-y-auto p-4">
            {msgs.map((m, i) => (
              <div key={i} className={`flex animate-feed-in ${m.from === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={
                    m.from === "user"
                      ? "max-w-[85%] rounded-2xl rounded-br-md bg-brand px-4 py-2.5 text-[13px] leading-relaxed"
                      : "max-w-[88%] rounded-2xl rounded-bl-md border border-white/8 bg-white/[0.05] px-4 py-2.5 text-[13px] leading-relaxed text-white/85"
                  }
                >
                  {m.text}
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md border border-white/8 bg-white/[0.05] px-4 py-3">
                  <span className="flex gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-brand-soft"
                        style={{ animationDelay: `${i * 0.2}s` }}
                      />
                    ))}
                  </span>
                </div>
              </div>
            )}
            {action === "trust" && !typing && (
              <button
                onClick={() => {
                  setOpen(false);
                  nav("trust");
                }}
                className="inline-flex animate-feed-in items-center gap-2 rounded-full border border-mint/40 bg-mint/10 px-4 py-2 text-[12px] font-bold text-mint transition-all hover:bg-mint hover:text-ink"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Open Trust & Safety
              </button>
            )}
          </div>

          <div className="border-t border-white/8 p-3">
            <div className="mb-2.5 flex flex-wrap gap-1.5">
              {QUICK.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[10.5px] font-medium text-white/55 transition-colors hover:border-brand/50 hover:text-brand-soft"
                >
                  {q}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Ask me anything…"
                className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[13px] outline-none transition-colors placeholder:text-white/30 focus:border-brand/50"
              />
              <button
                onClick={() => send()}
                aria-label="Send"
                className="rounded-xl bg-brand p-2.5 glow-brand transition-shadow"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
