import { useRef, useState } from "react";

/** Subtle 3D cursor tilt (React Bits "Tilted Card" concept). */
export default function TiltedCard({ children, className = "", maxTilt = 7 }) {
  const ref = useRef(null);
  const [t, setT] = useState({ rx: 0, ry: 0 });

  const onMove = (e) => {
    const r = ref.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setT({ rx: -py * maxTilt, ry: px * maxTilt });
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={() => setT({ rx: 0, ry: 0 })}
      className={className}
      style={{
        transform: `perspective(900px) rotateX(${t.rx}deg) rotateY(${t.ry}deg)`,
        transition: "transform .3s cubic-bezier(.22,1,.36,1)",
        transformStyle: "preserve-3d",
      }}
    >
      {children}
    </div>
  );
}
