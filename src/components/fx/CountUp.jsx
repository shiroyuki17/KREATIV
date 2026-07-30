import { useEffect, useRef, useState } from "react";

/** Eased count-up on scroll into view. */
export default function CountUp({
  to,
  prefix = "",
  suffix = "",
  decimals = 0,
  duration = 1600,
  className = "",
}) {
  const ref = useRef(null);
  const [val, setVal] = useState(0);

  useEffect(() => {
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        const t0 = performance.now();
        const tick = (now) => {
          const p = Math.min((now - t0) / duration, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          setVal(to * eased);
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.4 }
    );
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, [to, duration]);

  const shown =
    decimals > 0
      ? val.toFixed(decimals)
      : Math.round(val).toLocaleString("en-US");

  return (
    <span ref={ref} className={className}>
      {prefix}
      {shown}
      {suffix}
    </span>
  );
}
