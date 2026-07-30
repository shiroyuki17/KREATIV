import { useEffect, useRef } from "react";

// Day 9 (PRD): "Spline Integration". Жинхэнэ Spline акаунт/scene байхгүй тул
// (embed хийхэд заавал өөрийн scene URL шаардлагатай), туслах сан ашиглалгүйгээр
// canvas дээр дурвсан бөмбөрцгийг гараар дүрсэлж дуурайлгав — dependency-гүй,
// prefers-reduced-motion-ыг хүндэтгэдэг.
export default function AmbientOrb({ size = 380, className = "" }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Fibonacci sphere — цэгүүдийг бөмбөрцгийн гадаргуу дээр жигд тарааж байрлуулна
    const N = 170;
    const points = [];
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const radius = Math.sqrt(1 - y * y);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      points.push([Math.cos(theta) * radius, y, Math.sin(theta) * radius]);
    }

    const R = size * 0.34;
    const cx = size / 2;
    const cy = size / 2;
    let angle = 0;
    let raf;

    function draw() {
      ctx.clearRect(0, 0, size, size);
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      const projected = points
        .map(([x, y, z]) => {
          const rx = x * cosA - z * sinA;
          const rz = x * sinA + z * cosA;
          const scale = 1 / (2 - rz * 0.6);
          return { x: cx + rx * R * scale, y: cy + y * R * scale, z: rz, s: scale };
        })
        .sort((a, b) => a.z - b.z);

      for (const p of projected) {
        const alpha = 0.2 + ((p.z + 1) / 2) * 0.65;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.5 * p.s, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(52, 227, 173, ${alpha})`;
        ctx.fill();
      }

      if (!reduceMotion) {
        angle += 0.0035;
        raf = requestAnimationFrame(draw);
      }
    }

    draw();
    return () => cancelAnimationFrame(raf);
  }, [size]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{ width: size, height: size }}
      className={`pointer-events-none ${className}`}
    />
  );
}
