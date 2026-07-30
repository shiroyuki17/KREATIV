import { useEffect, useRef, useState } from "react";

/** Character-level slide-up reveal (React Bits "Split Text" concept). */
export default function SplitText({ text, className = "", stagger = 26, delay = 0 }) {
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
      { threshold: 0.3 }
    );
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  let charIndex = 0;
  return (
    <span ref={ref} className={className} aria-label={text} role="text">
      {text.split(" ").map((word, wi) => (
        <span key={wi} className="inline-block overflow-hidden align-bottom">
          <span className="inline-block whitespace-pre">
            {word.split("").map((ch, ci) => {
              const d = delay + charIndex++ * stagger;
              return (
                <span
                  key={ci}
                  aria-hidden="true"
                  className="inline-block will-change-transform transition-transform duration-700"
                  style={{
                    transform: on ? "translateY(0)" : "translateY(115%)",
                    transitionDelay: `${d}ms`,
                    transitionTimingFunction: "cubic-bezier(.22,1,.36,1)",
                  }}
                >
                  {ch}
                </span>
              );
            })}
          </span>
          <span className="inline-block">{" "}</span>
        </span>
      ))}
    </span>
  );
}
