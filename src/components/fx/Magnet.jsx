import { useEffect, useRef } from "react";
import { createAnimatable } from "animejs";
import { prefersReduced } from "../../lib/motion.js";

/**
 * Соронзон hover — курсор дээр очиход товч бага зэрэг түүн рүү дагаж хөдөлнө.
 *
 * Энэ эффект нэг удаа устгагдаж байсан ("janky/broken" гэж). Шалтгаан нь
 * mousemove бүрт React state шинэчилж, кадр бүрт бүтэн component-ыг дахин
 * render хийж байсанд байв. Одоо anime-ийн createAnimatable утгыг шууд DOM
 * руу зөөлрүүлж бичдэг тул React огт оролцохгүй — гулгамтгай.
 *
 * Хөдөлгөөнийг зориуд багаар барив: зөвхөн курсор элемент дээр байхад
 * ажиллана (алсаас татдаггүй), хазайлт нь бага. Layout мөн өмнөх шигээ
 * inline-block хэвээр тул 11 дуудлагын цэгийн байрлал хөдлөхгүй.
 */
export default function Magnet({ children, className = "", strength = 0.2 }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReduced()) return undefined;

    const follow = createAnimatable(el, {
      x: { duration: 380, ease: "out(3)" },
      y: { duration: 380, ease: "out(3)" },
    });

    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      follow.x((e.clientX - (r.left + r.width / 2)) * strength);
      follow.y((e.clientY - (r.top + r.height / 2)) * strength);
    };
    // Гарахад төв рүүгээ арай удаан буцна — "суларч байгаа" мэдрэмж.
    const onLeave = () => {
      follow.x(0, 520);
      follow.y(0, 520);
    };

    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
      follow.revert();
    };
  }, [strength]);

  return (
    <div ref={ref} className={`inline-block ${className}`}>
      {children}
    </div>
  );
}
