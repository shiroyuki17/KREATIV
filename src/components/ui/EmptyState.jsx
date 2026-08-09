// Нэгдсэн "хоосон байдал" харагдац — бүх dashboard/list-д ижил хэв маягтай
// (icon glow + гарчиг + тайлбар + CTA) ашиглаж, "0 зүйл" мессежийг зүгээр
// саарал текст биш, урьдчилж харуулах, урамшуулах мөч болгоно.
export default function EmptyState({ Icon, title, desc, actionLabel, onAction, compact = false }) {
  return (
    <div className={`flex flex-col items-center text-center ${compact ? "py-8" : "py-12"}`}>
      <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-brand/25 bg-brand/[0.07] text-brand-soft">
        <span className="absolute inset-0 rounded-2xl bg-brand/10 blur-lg" aria-hidden="true" />
        <Icon className="relative h-6 w-6" />
      </span>
      <p className="mt-4 text-[13.5px] font-semibold text-white/80">{title}</p>
      {desc && <p className="mt-1 max-w-xs text-[12px] leading-relaxed text-white/40">{desc}</p>}
      {actionLabel && (
        <button
          onClick={onAction}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-brand/40 bg-brand/10 px-4 py-2 text-[12px] font-bold text-brand-soft transition-all hover:bg-brand hover:text-fg-1"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
