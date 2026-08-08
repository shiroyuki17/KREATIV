import { DUR, reveal, stagger, useMotion } from "../../lib/motion.js";

/**
 * Word-by-word blur reveal (React Bits "Blur Text" concept).
 *
 * Props нь өмнөхтэй яг ижил — 14 дуудлагын цэг өөрчлөгдөхгүй. Дотор нь
 * component бүрийн өөрийн IntersectionObserver-ыг anime-ийн onScroll-оор
 * сольж, үг бүрийн саатлыг гараар тооцохын оронд stagger() ашиглав.
 */
export default function BlurText({ text, className = "", stagger: step = 70 }) {
  const ref = useMotion(() => {
    reveal(".blur-word", {
      opacity: [0, 1],
      filter: ["blur(12px)", "blur(0px)"],
      y: [16, 0],
      duration: DUR.slow,
      delay: stagger(step),
    });
  }, [text, step]);

  return (
    <span ref={ref} className={className} aria-label={text} role="text">
      {text.split(" ").map((word, i) => (
        <span
          key={i}
          aria-hidden="true"
          // opacity-г эхэлж inline-аар нуух нь чухал: onScroll нь элемент
          // харагдах хүртэл хүлээдэг тул эс тэгвэл текст эхлээд бүтэн
          // гараад дараа нь 0 болж "анивчих" болно.
          style={{ opacity: 0 }}
          // `whitespace-pre` — үгийн ард байгаа хоосон зай inline-block дотор
          // хумигдан өргөнөө алддаг тул үгс "Postabrief,getAI-matched" гэж
          // наалддаг байв. Зайг санааны дагуу хэвээр үлдээхийн тулд хэрэгтэй.
          className="blur-word inline-block whitespace-pre will-change-[transform,filter,opacity]"
        >
          {word}
          {" "}
        </span>
      ))}
    </span>
  );
}
