/** Orbiting glow border (React Bits "Star Border" concept). */
export default function StarBorder({
  children,
  className = "",
  color = "rgba(52, 227, 173, 0.9)",
  radius = "rounded-2xl",
}) {
  return (
    <div className={`relative h-full overflow-hidden p-[1.5px] ${radius} ${className}`}>
      <div
        aria-hidden="true"
        className="absolute bottom-[-12px] right-[-240%] h-1/2 w-[300%] animate-star-a rounded-full"
        style={{ background: `radial-gradient(circle, ${color}, transparent 12%)` }}
      />
      <div
        aria-hidden="true"
        className="absolute top-[-12px] left-[-240%] h-1/2 w-[300%] animate-star-b rounded-full"
        style={{ background: `radial-gradient(circle, ${color}, transparent 12%)` }}
      />
      <div className={`relative z-10 h-full border border-white/10 bg-panel ${radius}`}>
        {children}
      </div>
    </div>
  );
}
