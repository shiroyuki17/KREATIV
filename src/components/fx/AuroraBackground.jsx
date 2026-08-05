// Sайтын цаана алгуурхан хөдлөх, зөөлөн туяатай gradient blob-ууд — fixed тул
// scroll хийхэд бүх section-ийн цаана байнга харагдана. Тэс болдоггүй CSS
// animation (drift-a/b/c, index.css) ашигладаг тул JS-ийн зардалгүй, мөн
// prefers-reduced-motion-той сайтын глобал дүрмээр л зогсдог.
export default function AuroraBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute left-[-10%] top-[-10%] h-[560px] w-[560px] animate-drift-a rounded-full bg-brand/18 blur-[150px]" />
      <div className="absolute right-[-12%] top-[20%] h-[620px] w-[620px] animate-drift-b rounded-full bg-neon/14 blur-[160px]" />
      <div className="absolute bottom-[-15%] left-[20%] h-[520px] w-[520px] animate-drift-c rounded-full bg-violet/14 blur-[150px]" />
    </div>
  );
}
