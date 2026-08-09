// Хэрэглэгчийн зураг — бодит зураг байвал түүнийг, үгүй бол нэрнээс нь
// үүсгэсэн өнгөт үсэг.
//
// Өмнө нь энэ логик 6 файлд давхардаж бичигдсэн бөгөөд бүгд ИЖИЛ градиент
// ашигладаг тул нэг жагсаалт дээрх бүх хүн адилхан харагддаг байв. Одоо
// өнгө нь нэрнээс тодорхойлогдоно: нэг хүн хаана ч ижил өнгөтэй, өөр хүн
// өөр өнгөтэй.
//
// Санаатайгаар зохиомол ГЭРЭЛ ЗУРАГ ашиглахгүй: stock фото нь бодит бус
// хүнийг платформын хэрэглэгч мэт харуулна. Үсэг нь чимэглэл — хэн нэгний
// талаар худал мэдэгдэл хийхгүй.

// Брэндийн палитраас сонгосон, харанхуй дэвсгэр дээр уншигдахуйц хослолууд.
const PALETTE = [
  "from-brand/60 to-brand-soft/35 text-brand-soft",
  "from-neon/55 to-brand/30 text-neon",
  "from-violet/55 to-violet-soft/30 text-violet-soft",
  "from-mint/55 to-neon/30 text-mint",
  "from-amber-400/50 to-rose-400/25 text-amber-200",
  "from-rose-400/50 to-violet/25 text-rose-200",
  "from-sky-400/50 to-neon/25 text-sky-200",
];

/** Тогтвортой хэш — ижил нэр үргэлж ижил өнгө өгнө (Math.random БИШ). */
function paletteFor(seed) {
  const s = String(seed || "");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export function initialsOf(name) {
  return (
    String(name || "?")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0] || "")
      .join("")
      .toUpperCase() || "?"
  );
}

/**
 * @param {string}  [src]   — бодит зургийн хаяг (avatarSrc()-ээр боловсруулсан)
 * @param {string}  name    — үсэг гаргах, мөн өнгө сонгох үндэс
 * @param {string}  [seed]  — өнгийг тогтооход name-ийн оронд (жишээ нь userId)
 * @param {string}  [size]  — Tailwind-ийн хэмжээ, өгөгдмөл h-9 w-9
 */
export default function Avatar({ src, name, seed, size = "h-9 w-9", className = "" }) {
  const base = `relative flex shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-white/15 ${size} ${className}`;

  if (src) {
    return (
      <img
        src={src}
        alt={name || ""}
        loading="lazy"
        className={`${base} object-cover`}
      />
    );
  }

  const tone = paletteFor(seed || name);
  return (
    <span
      aria-hidden="true"
      className={`${base} bg-gradient-to-br font-display text-[0.34em] font-bold ${tone}`}
      style={{ fontSize: "inherit" }}
    >
      <span className="text-[0.78em] leading-none">{initialsOf(name)}</span>
    </span>
  );
}
