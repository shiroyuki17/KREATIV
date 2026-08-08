import { useState } from "react";
import { Mail, MessageSquare, Clock, MapPin, Check, LifeBuoy } from "lucide-react";
import BlurText from "../fx/BlurText.jsx";
import { useNav } from "../../nav.jsx";

const TOPICS = ["General", "Billing & payments", "Trust & safety", "Partnerships", "Press"];

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
  const [sent, setSent] = useState(false);
  const [topic, setTopic] = useState("General");

  return (
    <div className="mx-auto max-w-6xl px-6 pb-24 pt-36">
      <div className="text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-soft">— Contact us</p>
        <h1 className="mt-4 font-display text-[clamp(2rem,4vw,3rem)] font-bold text-brand text-glow tracking-tight">
          <BlurText text="Let's talk." />
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-white/55">
          Questions, feedback, or a partnership idea? Send us a note — we usually reply within a few hours.
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
              <h2 className="mt-2 font-display text-xl font-bold">Message sent</h2>
              <p className="max-w-sm text-[13.5px] text-white/50">Thanks for reaching out — we'll get back to you shortly at the email you provided.</p>
              <button onClick={() => setSent(false)} className="mt-3 text-[13px] font-semibold text-brand-soft hover:text-white">
                Send another
              </button>
            </div>
          ) : (
            <>
              <div className="mb-5 flex flex-wrap gap-2">
                {TOPICS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTopic(t)}
                    className={topic === t
                      ? "rounded-full bg-brand px-3.5 py-1.5 text-[11.5px] font-semibold text-ink"
                      : "rounded-full border border-white/10 px-3.5 py-1.5 text-[11.5px] font-medium text-white/55 transition-colors hover:text-white"}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Name" placeholder="Ava Torres" />
                <Field label="Email" type="email" placeholder="you@studio.com" />
              </div>
              <label className="mt-4 block">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-white/40">Message</span>
                <textarea rows={5} placeholder="How can we help?" className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[14px] leading-relaxed outline-none transition-colors placeholder:text-white/25 focus:border-brand/50" />
              </label>
              <button
                onClick={() => setSent(true)}
                className="mt-5 w-full rounded-xl bg-brand py-3.5 text-[14px] font-semibold text-ink glow-brand transition-shadow"
              >
                Send message
              </button>
            </>
          )}
        </div>

        {/* Info */}
        <div className="space-y-4">
          {[
            { Icon: Mail, label: "Email us", value: "hello@kreativ.com" },
            { Icon: Clock, label: "Response time", value: "Under 4 hours, every day" },
            { Icon: MapPin, label: "Offices", value: "Remote-first · Barcelona · Seoul" },
          ].map(({ Icon, label, value }) => (
            <div key={label} className="glass flex items-center gap-4 rounded-2xl p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-brand/30 bg-brand/10 text-brand-soft">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-white/40">{label}</p>
                <p className="mt-0.5 text-[14px] font-semibold">{value}</p>
              </div>
            </div>
          ))}
          <div className="glass rounded-2xl p-5">
            <p className="inline-flex items-center gap-2 text-[13px] font-semibold"><LifeBuoy className="h-4 w-4 text-brand-soft" /> Looking for quick answers?</p>
            <p className="mt-1.5 text-[12.5px] text-white/50">Most questions are answered in the Help Center.</p>
            <button onClick={() => nav("help")} className="mt-3 inline-flex items-center gap-2 text-[13px] font-semibold text-brand-soft hover:text-white">
              <MessageSquare className="h-4 w-4" /> Visit Help Center
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
