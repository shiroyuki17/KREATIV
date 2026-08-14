import { useState } from "react";
import { MessageSquare, Check, LifeBuoy, ShieldCheck, AlertCircle, Loader2 } from "lucide-react";
import BlurText from "../fx/BlurText.jsx";
import { useNav } from "../../nav.jsx";
import { useT } from "../../i18n.jsx";
import { sendContactMessage } from "../../lib/supportApi.js";

// Энэ форм өмнө нь ХААШАА Ч илгээдэггүй байв: "Send message" товч нь
// `setSent(true)` гэж төлөв солиход л хүрч, "Message sent" гэсэн баталгаа
// гардаг байсан. Хүн санаа зовсон асуудлаа бичээд явчихдаг, зурвас нь
// хаана ч очдоггүй. Одоо POST /support/contact руу явж, өгөгдлийн санд
// хадгалагдаад админд имэйлээр мэдэгддэг.
//
// Мөн хажуугийн багана нь "hello@kreativ.com" (буруу домэйн), "Under 4
// hours, every day" (ямар ч журамд тулгуураагүй амлалт), "Barcelona ·
// Seoul" (байхгүй оффисууд) харуулж байв — гурвуулаа хассан.

// Утга нь backend-ийн enum-тай яг таарна; зөвхөн шошго нь орчуулагдана.
const TOPICS = [
  { value: "general", labelKey: "ct.topicGeneral" },
  { value: "billing", labelKey: "ct.topicBilling" },
  { value: "trust", labelKey: "ct.topicTrust" },
  { value: "partnership", labelKey: "ct.topicPartnership" },
  { value: "press", labelKey: "ct.topicPress" },
];

function Field({ label, ...props }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-white/40">{label}</span>
      <input {...props} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[14px] outline-none transition-colors placeholder:text-white/25 focus:border-brand/50" />
    </label>
  );
}

export default function Contact() {
  const { nav } = useNav();
  const t = useT();
  const [sent, setSent] = useState(false);
  const [topic, setTopic] = useState("general");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const canSend = name.trim().length >= 2 && email.includes("@") && message.trim().length >= 10;

  async function submit() {
    if (!canSend || busy) return;
    setBusy(true);
    setError("");
    try {
      await sendContactMessage({
        name: name.trim(),
        email: email.trim(),
        topic,
        message: message.trim(),
      });
      setSent(true);
      setName("");
      setEmail("");
      setMessage("");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 pb-24 pt-36">
      <div className="text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-soft">{t("ct.eyebrow")}</p>
        <h1 className="mt-4 font-display text-[clamp(2rem,4vw,3rem)] font-bold text-brand text-glow tracking-tight">
          <BlurText text={t("ct.title")} />
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-white/55">
          {t("ct.intro")}
        </p>
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Form */}
        <div className="glass rounded-3xl p-7 md:p-8">
          {sent ? (
            <div className="flex flex-col items-center gap-3 py-14 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-mint bg-mint/10 text-mint glow-mint">
                <Check className="h-7 w-7" />
              </span>
              <h2 className="mt-2 font-display text-xl font-bold">{t("ct.sentTitle")}</h2>
              <p className="max-w-sm text-[13.5px] text-white/50">{t("ct.sentDesc")}</p>
              <button onClick={() => setSent(false)} className="mt-3 text-[13px] font-semibold text-brand-soft hover:text-white">
                {t("ct.sendAnother")}
              </button>
            </div>
          ) : (
            <>
              <div className="mb-5 flex flex-wrap gap-2">
                {TOPICS.map((o) => (
                  <button
                    key={o.value}
                    onClick={() => setTopic(o.value)}
                    className={topic === o.value
                      ? "rounded-full bg-brand px-3.5 py-1.5 text-[11.5px] font-semibold text-ink"
                      : "rounded-full border border-white/10 px-3.5 py-1.5 text-[11.5px] font-medium text-white/55 transition-colors hover:text-white"}
                  >
                    {t(o.labelKey)}
                  </button>
                ))}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t("ct.name")} value={name} onChange={(e) => setName(e.target.value)} placeholder={t("ct.namePh")} />
                <Field label={t("ct.email")} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("ct.emailPh")} />
              </div>
              <label className="mt-4 block">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-white/40">{t("ct.message")}</span>
                <textarea
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t("ct.messagePh")}
                  className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[14px] leading-relaxed outline-none transition-colors placeholder:text-white/25 focus:border-brand/50"
                />
              </label>

              {error && (
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-[12.5px] text-red-300">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <button
                onClick={submit}
                disabled={!canSend || busy}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3.5 text-[14px] font-semibold text-fg-1 glow-brand transition-shadow disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {busy ? t("ct.sending") : t("ct.send")}
              </button>
            </>
          )}
        </div>

        {/* Info */}
        <div className="space-y-4">
          <div className="glass rounded-2xl p-5">
            <p className="inline-flex items-center gap-2 text-[13px] font-semibold">
              <LifeBuoy className="h-4 w-4 text-brand-soft" /> {t("ct.helpTitle")}
            </p>
            <p className="mt-1.5 text-[12.5px] text-white/50">{t("ct.helpDesc")}</p>
            <button onClick={() => nav("help")} className="mt-3 inline-flex items-center gap-2 text-[13px] font-semibold text-brand-soft hover:text-white">
              <MessageSquare className="h-4 w-4" /> {t("ct.helpBtn")}
            </button>
          </div>
          <div className="glass rounded-2xl p-5">
            <p className="inline-flex items-center gap-2 text-[13px] font-semibold">
              <ShieldCheck className="h-4 w-4 text-mint" /> {t("ct.escrowTitle")}
            </p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-white/50">{t("ct.escrowDesc")}</p>
            <button onClick={() => nav("dispute-policy")} className="mt-3 inline-flex items-center gap-2 text-[13px] font-semibold text-mint hover:text-white">
              {t("ct.escrowBtn")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
