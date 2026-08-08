import { useState } from "react";
import { Sparkles, Send } from "lucide-react";

// Shared right-rail AI assistant panel (Find Talent / Find Work). Chips run a
// real filter/sort action against the page's own state — this isn't a live
// LLM, so the log only ever echoes back which filter it just applied.
export default function AiPanel({ title, chips, onRefine }) {
  const [draft, setDraft] = useState("");
  const [log, setLog] = useState([]);

  function runChip(chip) {
    chip.run();
    setLog((l) => [...l, { role: "system", text: `Showing: ${chip.label.toLowerCase()}` }]);
  }

  function submitRefine(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onRefine(text);
    setLog((l) => [...l, { role: "user", text }, { role: "system", text: `Filtered results for "${text}"` }]);
    setDraft("");
  }

  return (
    <aside className="glass sticky top-24 hidden h-[calc(100vh-7rem)] w-[340px] shrink-0 flex-col rounded-2xl border border-white/10 p-5 xl:flex">
      <div className="flex items-center gap-2 border-b border-white/8 pb-4">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand">
          <Sparkles className="h-3.5 w-3.5 text-ink" />
        </span>
        <p className="text-[13.5px] font-semibold">{title}</p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto py-4">
        <div>
          <p className="text-[12.5px] text-white/45">What should we look for?</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {chips.map((c) => (
              <button
                key={c.label}
                onClick={() => runChip(c)}
                className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-left text-[12px] font-medium text-white/65 transition-colors hover:border-brand/40 hover:text-white"
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {log.length > 0 && (
          <div className="space-y-2.5 border-t border-white/8 pt-3">
            {log.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === "user"
                    ? "ml-auto max-w-[88%] rounded-xl rounded-br-sm bg-brand/15 px-3 py-2 text-[12.5px] text-white"
                    : "max-w-[88%] rounded-xl rounded-bl-sm bg-white/5 px-3 py-2 text-[12.5px] text-white/65"
                }
              >
                {m.text}
              </div>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={submitRefine} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-1.5 focus-within:border-brand/50">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Refine these results…"
          className="min-w-0 flex-1 bg-transparent px-2 text-[13px] outline-none placeholder:text-white/30"
        />
        <button
          type="submit"
          aria-label="Send"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand text-ink transition-shadow"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </form>
    </aside>
  );
}
