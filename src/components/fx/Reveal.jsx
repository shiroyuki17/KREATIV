import { motion } from "framer-motion";

// Scroll-triggered fade/rise-in, once per element. `delay` lets sibling
// grids stagger without each item needing its own IntersectionObserver.
export default function Reveal({ children, delay = 0, y = 22, className = "", as = "div" }) {
  const Comp = motion[as] || motion.div;
  return (
    <Comp
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </Comp>
  );
}
