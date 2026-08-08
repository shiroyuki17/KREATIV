import { useRef } from "react";

/** Cursor-following radial spotlight on hover (React Bits "Spotlight Card" concept). */
export default function SpotlightCard({
  children,
  className = "",
  spotColor = "rgba(201, 160, 99, 0.14)",
  as: Tag = "div",
  ...rest
}) {
  const ref = useRef(null);

  const onMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--sx", `${e.clientX - r.left}px`);
    el.style.setProperty("--sy", `${e.clientY - r.top}px`);
  };

  return (
    <Tag
      ref={ref}
      onMouseMove={onMove}
      className={`group relative overflow-hidden rounded-2xl glass ${className}`}
      {...rest}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background: `radial-gradient(420px circle at var(--sx, 50%) var(--sy, 50%), ${spotColor}, transparent 65%)`,
        }}
      />
      <div className="relative z-10 h-full">{children}</div>
    </Tag>
  );
}
