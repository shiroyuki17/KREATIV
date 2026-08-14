import { useEffect, useRef, useState } from "react";
import { Sparkles, Send, X, ShieldCheck } from "lucide-react";
import { useNav } from "../nav.jsx";
import { useI18n } from "../i18n.jsx";
import { API_BASE } from "../lib/authApi.js";

const QUICK_KEYS = ["cw.q1", "cw.q2", "cw.q3", "cw.q4"];

// Амьд өгөгдөл татдаг дүрмүүд. Эдгээр нь ЭХЛЭЭД ажиллана: доорх статик
// дүрмүүд урьдчилан бичсэн текст буцаадаг бол энэ хоёр нь backend-ээс
// жинхэнэ тоо аваад хариулна. Татаж чадаагүй үед статик дүрэм рүү унана.
const DYNAMIC_RULES = [
  {
    re: /(how many|stats|statistic|freelancer count|нийт хэд|хэдэн (freelancer|фрилансер|client|захиалагч|ажил|зар))/i,
    run: async (t) => {
      const res = await fetch(`${API_BASE}/analytics/public`);
      if (!res.ok) throw new Error("stats unavailable");
      const s = await res.json();
      return t("cw.stats", {
        freelancers: s.freelancers, clients: s.clients, jobs: s.jobs, openJobs: s.openJobs,
      });
    },
  },
  {
    // Үнийг ХЭЗЭЭ Ч гараар бичихгүй: өмнө нь энд "$29/mo" гэж хатуу
    // бичсэн байсан бөгөөд Stripe дээрх бодит үнэ $29.99 болсноор бот
    // хэрэглэгчид буруу дүн хэлдэг байв. Одоо /plans-аас шууд уншина.
    re: /(fee|commission|price|cost|charge|plan|шимтгэл|үнэ|төлбөр|багц)/i,
    run: async (t) => {
      const res = await fetch(`${API_BASE}/plans`);
      if (!res.ok) throw new Error("plans unavailable");
      const { plans } = await res.json();
      const by = Object.fromEntries(plans.map((p) => [p.key, p]));
      if (!by.starter || !by.pro) throw new Error("plans incomplete");
      return t("cw.fees", {
        starter: by.starter.commissionPct,
        pro: by.pro.commissionPct,
        proPrice: by.pro.monthlyUsd,
      });
    },
  },
];

// Түлхүүр үгэнд суурилсан статик дүрмүүд (LLM тохируулаагүй үеийн нөөц).
//
// ⚠️ Энд ЗӨВХӨН баталгаатай зүйл бичнэ. Өмнө нь эдгээр хариултууд "Daniel
// Kim (5.0★, $95/hr) — 98% тохирол", "~3.2 цагийн дотор тохируулна",
// "маргааны 99.2% нь шударгаар шийдэгддэг" гэсэн тоонуудыг хэлдэг байв.
// Ийм хүн байхгүй, тэр тоонуудын ард ямар ч өгөгдөл байгаагүй — өөрөөр
// хэлбэл дэмжлэгийн бот хэрэглэгчид худал ярьж байсан.
const RULES = [
  {
    re: /(scam|fraud|cheat|not paid|hasn'?t paid|didn'?t pay|no pay|won'?t pay|stole|missing money|төлөхгүй|төлбөрөө өгөхгүй|залилан)/i,
    key: "cw.notPaid",
    action: "trust",
  },
  {
    re: /(escrow|protect|safe|secure|guarantee|хамгаалалт|баталгаа|аюулгүй)/i,
    key: "cw.escrow",
    action: "trust",
  },
  {
    re: /(fee|commission|price|cost|charge|plan|шимтгэл|үнэ|төлбөр|багц)/i,
    key: "cw.fees",
  },
  {
    re: /(find|hire|match|need a|looking for|developer|designer|freelancer|talent|хайх|хөлслөх|авьяас)/i,
    key: "cw.find",
  },
  {
    re: /(dispute|refund|problem|issue|help|маргаан|буцаалт|асуудал|тусла)/i,
    key: "cw.dispute",
    action: "trust",
  },
];

// Статик дүрэм рүү унасан үед үнийн асуулт нь /plans-гүйгээр хариулагдана.
// Тэр үед {proPrice} гэх орлуулга дүүргэгдэхгүй тул шимтгэлийн хувийг
// backend-ийн PLANS-тай таарсан утгуудаар бөглөнө — эдгээр нь Stripe-аас
// хамаардаггүй тогтмолууд.
const STATIC_FEE_VARS = { starter: 10, pro: 5, proPrice: "29.99" };

async function reply(input, t) {
  for (const r of DYNAMIC_RULES) {
    if (r.re.test(input)) {
      try {
        return { text: await r.run(t) };
      } catch {
        break;
      }
    }
  }
  for (const r of RULES) {
    if (r.re.test(input)) return { text: t(r.key, STATIC_FEE_VARS), action: r.action };
  }
  return { text: t("cw.fallback") };
}

// Module-level, not state — persists for the whole page load. null = not
// checked yet, false = backend confirmed "not configured" (or unreachable),
// so we stop retrying it for the rest of the session and just use the
// rule-based reply() above. This is the same demo/real-fallback pattern as
// QPay and Google OAuth: real LLM the moment ANTHROPIC_API_KEY is set on the
// backend, silent fallback to the rule-based bot until then.
let aiAvailable = null;

async function getReply(history, latest, t, locale) {
  if (aiAvailable !== false) {
    try {
      const apiMessages = [...history, { from: "user", text: latest }]
        .slice(-10)
        .map((m) => ({ role: m.from === "user" ? "user" : "assistant", content: m.text }));
      const res = await fetch(`${API_BASE}/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Сонгосон хэлээ дамжуулна — интерфэйс монгол байхад бот англиар
        // ярих нь хамгийн их анзаарагддаг зөрүү.
        body: JSON.stringify({ messages: apiMessages, locale }),
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
  return reply(latest, t);
}

export default function ChatWidget() {
  const { nav } = useNav();
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([]);
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
    const input = (text ?? draft).trim();
    if (!input || typing) return;
    setDraft("");
    setAction(null);
    const history = [{ from: "bot", text: t("cw.greeting") }, ...msgs];
    setMsgs((m) => [...m, { from: "user", text: input }]);
    setTyping(true);
    const askedAt = Date.now();
    getReply(history, input, t, locale).then((r) => {
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
        aria-label={open ? t("cw.closeChat") : t("cw.open")}
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
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-fg-1 glow-brand">
                <Sparkles className="h-4.5 w-4.5" />
              </span>
              <div>
                <p className="font-display text-[14px] font-bold tracking-wide text-white">KREATIV AI</p>
                <p className="text-[10.5px] text-brand-soft">{t("cw.online")}</p>
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
            {[{ from: "bot", text: t("cw.greeting") }, ...msgs].map((m, i) => (
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
                {t("cw.openTrust")}
              </button>
            )}
          </div>

          <div className="border-t border-white/8 p-3">
            <div className="mb-2.5 flex flex-wrap gap-1.5">
              {QUICK_KEYS.map((key) => (
                <button
                  key={key}
                  onClick={() => send(t(key))}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[10.5px] font-medium text-white/55 transition-colors hover:border-brand/50 hover:text-brand-soft"
                >
                  {t(key)}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder={t("cw.placeholder")}
                className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[13px] outline-none transition-colors placeholder:text-white/30 focus:border-brand/50"
              />
              <button
                onClick={() => send()}
                aria-label={t("ap.send")}
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
