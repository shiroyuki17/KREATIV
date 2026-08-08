import { useEffect, useRef } from "react";
import { revealValue } from "../../lib/motion.js";

/**
 * Eased count-up on scroll into view.
 *
 * Тоог proxy объект дээр tween хийгээд DOM руу шууд бичнэ — өмнө нь кадр
 * бүрт setState дуудаж бүтэн component-ыг дахин render хийдэг байсныг
 * орлуулав (нэг дэлгэц дээр 4 тоолуур зэрэг ажиллахад мэдэгдэхүйц).
 */
export default function CountUp({
  to,
  prefix = "",
  suffix = "",
  decimals = 0,
  duration = 1600,
  className = "",
}) {
  const numRef = useRef(null);

  useEffect(() => {
    const el = numRef.current;
    if (!el) return undefined;

    const format = (n) =>
      decimals > 0 ? n.toFixed(decimals) : Math.round(n).toLocaleString("en-US");

    return revealValue(el, {
      to,
      duration,
      onUpdate: (value) => {
        el.textContent = format(value);
      },
    });
  }, [to, duration, decimals]);

  return (
    <span className={className}>
      {prefix}
      <span ref={numRef} />
      {suffix}
    </span>
  );
}
