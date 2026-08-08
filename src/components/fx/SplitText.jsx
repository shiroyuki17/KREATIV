import { Fragment } from "react";
import { DUR, reveal, stagger, useMotion } from "../../lib/motion.js";

/** Character-level slide-up reveal (React Bits "Split Text" concept). */
export default function SplitText({ text, className = "", stagger: step = 26, delay = 0 }) {
  const ref = useMotion(() => {
    reveal(".split-char", {
      y: ["115%", "0%"],
      duration: DUR.slow,
      delay: stagger(step, { start: delay }),
    });
  }, [text, step, delay]);

  return (
    <span ref={ref} className={className} aria-label={text} role="text">
      {text.split(" ").map((word, wi) => (
        // Хоосон зайг үгийн WRAPPER-ЭЭС ГАДНА, fragment дотор тавина.
        // Өмнө нь `<span class="inline-block"> </span>` гэж overflow-hidden
        // эцгийн ДОТОР байсан: зөвхөн зайнаас бүрдэх inline-block нь өргөнөө
        // алддаг тул гарчиг "Elite work meets" биш "Eliteworkmeets" болж
        // наалддаг байв. `whitespace-pre` нь зайг хумигдахаас хамгаална.
        <Fragment key={wi}>
          <span className="inline-block overflow-hidden align-bottom">
            <span className="inline-block whitespace-pre">
              {word.split("").map((ch, ci) => (
                <span
                  key={ci}
                  aria-hidden="true"
                  // Эх байрлалыг inline-аар өгнө — overflow-hidden эцэг доор
                  // нуугдаж байгаад дээшээ гарч ирнэ.
                  style={{ transform: "translateY(115%)" }}
                  className="split-char inline-block will-change-transform"
                >
                  {ch}
                </span>
              ))}
            </span>
          </span>
          {wi < text.split(" ").length - 1 && <span className="whitespace-pre"> </span>}
        </Fragment>
      ))}
    </span>
  );
}
