import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { useEscapeKey } from "../../hooks/useEscapeKey.js";

// Native <select> дотрх <option> жагсаалт нь browser/OS-ийн өөрийнх нь
// render хийдэг тул CSS-ээр бүрэн хянах боломжгүй (dark theme-тэй
// зөрчилдөж, цагаан харагдана). Иймд бүрэн custom, өөрсдөө хянадаг
// dropdown — sort/filter select бүрийг үүгээр сольсон.
export default function Select({ icon: Icon, value, onChange, options, className = "" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEscapeKey(() => setOpen(false), open);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const current = options.find((o) => o.value === value);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[13px] text-white/75 transition-colors hover:border-white/20"
      >
        {Icon && <Icon className="h-4 w-4 shrink-0 text-white/40" />}
        <span className="truncate">{current?.label ?? ""}</span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-white/40 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-30 min-w-[190px] overflow-hidden rounded-xl border border-white/10 bg-[#1b1730] py-1.5 shadow-xl shadow-black/40">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onChange(o.value); setOpen(false); }}
              className={`flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left text-[13px] transition-colors ${
                o.value === value
                  ? "bg-brand/15 font-semibold text-brand-soft"
                  : "text-white/70 hover:bg-white/8 hover:text-white"
              }`}
            >
              {o.label}
              {o.value === value && <Check className="h-3.5 w-3.5 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
