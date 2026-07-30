import { useEffect, useRef, useState } from "react";

/** Word-by-word blur reveal (React Bits "Blur Text" concept). */
export default function BlurText({ text, className = "", stagger = 70 }) {
  const ref = useRef(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setOn(true);
          io.disconnect();
        }
      },
      { threshold: 0.25 }
    );
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  return (
    <span ref={ref} className={className} aria-label={text} role="text">
      {text.split(" ").map((word, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="inline-block will-change-transform transition-all duration-700 ease-out"
          style={{
            opacity: on ? 1 : 0,
            filter: on ? "blur(0px)" : "blur(12px)",
            transform: on ? "translateY(0)" : "translateY(16px)",
            transitionDelay: `${i * stagger}ms`,
          }}
        >
          {word}
          {" "}
        </span>
      ))}
    </span>
  );
}
