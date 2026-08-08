import { DUR, useReveal } from "../../lib/motion.js";

// Scroll-triggered fade/rise-in, once per element. `delay` lets sibling
// grids stagger without each item needing its own IntersectionObserver.
//
// Өмнө нь framer-motion-ий whileInView дээр байсан — сайтын бусад бүх
// хөдөлгөөн anime.js рүү шилжсэн тул хоёр дахь animation runtime үлдээхгүйн
// тулд энд ч мөн адил болгов. Гадаад API нь хэвээр: `delay` нь framer-motion
// шиг СЕКУНДЭЭР (дуудлагын цэгүүд `delay={0.1}` гэж дамжуулдаг), доор нь
// anime-ийн миллисекунд рүү хөрвүүлнэ.
export default function Reveal({ children, delay = 0, y = 22, className = "", as = "div" }) {
  const Tag = as;
  const ref = useReveal(
    { opacity: [0, 1], y: [y, 0], delay: delay * 1000, duration: DUR.slow },
    [delay, y]
  );

  return (
    <Tag ref={ref} className={className} style={{ opacity: 0 }}>
      {children}
    </Tag>
  );
}
