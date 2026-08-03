import { AlertTriangle, Lock, FileSearch, Scale, Check } from "lucide-react";
import { useNav } from "../../nav.jsx";

const STEPS = [
  { Icon: Lock, title: "1. Маргаан нээх — escrow царцана", desc: "Аль ч тал (client эсвэл freelancer) FUNDED/DELIVERED статустай milestone дээр маргаан нээж болно. Нээгдмэгц тухайн milestone-ийн escrow автоматаар царцаж, милсоны fund/deliver/approve/revision үйлдлүүд түгжигдэнэ — зөвхөн админ шийдвэрлэх хүртэл." },
  { Icon: FileSearch, title: "2. Нотолгоо — чат түүх автоматаар хавсарна", desc: "Тухайн гэрээний бүх чат зурвас (устгагдахгүй, түүхэн бичлэг) болон milestone-ийн deliverable/тайлбар нь админд шууд харагдана. Тал бүр маргааны шалтгаанаа бичихдээ нэмэлт тайлбар оруулж болно." },
  { Icon: Scale, title: "3. Админ шийдвэр", desc: "Админ гурван шийдвэрийн аль нэгийг гаргана: (а) Freelancer-д бүтнээр — комисс хассан дүн; (б) Client-д бүтнээр буцаах; (в) Тэнцүү хуваах — хагасыг нь freelancer авахдаа комисс төлнө, нөгөө хагас нь client рүү шимтгэлгүй буцна." },
  { Icon: Check, title: "4. Ledger бичигдэж, хоёр тал мэдэгдэл авна", desc: "Шийдвэр гарсны дараа тухайн Transaction ledger-т бичигдэж, хоёр тал platform мэдэгдэл (in-app notification) хүлээн авна. Гэрээний бусад milestone бүгд APPROVED бол Contract автоматаар COMPLETED болно." },
];

export default function DisputePolicy() {
  const { nav } = useNav();
  return (
    <div className="mx-auto max-w-3xl px-6 pb-24 pt-36">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-soft">— Legal</p>
      <h1 className="mt-3 font-display text-[clamp(1.8rem,3.5vw,2.6rem)] font-bold tracking-tight">Маргаан шийдвэрлэх журам</h1>
      <p className="mt-2 text-[12.5px] text-white/40">Хувилбар v0.1 · сүүлд шинэчлэгдсэн 2026-07-31</p>

      <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-400/25 bg-amber-400/[0.06] p-5">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
        <p className="text-[12.5px] leading-relaxed text-amber-200/90">
          Одоогийн шатанд шийдвэрийг платформын админ (хүн) гардан гаргадаг бөгөөд тогтмол хугацааны баталгаа
          (SLA) хараахан гэрээгээр баталгаажаагүй болно. Энэ журам нь техникийн хувьд хэрхэн ажилладгийг
          тодорхойлсон бөгөөд эцсийн хуулийн баримт бичиг биш.
        </p>
      </div>

      <div className="mt-10 space-y-6">
        {STEPS.map((s) => (
          <div key={s.title} className="glass rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand/30 bg-brand/10 text-brand-soft">
                <s.Icon className="h-4.5 w-4.5" />
              </span>
              <div>
                <p className="font-display text-[15px] font-bold">{s.title}</p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-white/55">{s.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10">
        <h2 className="font-display text-[17px] font-bold tracking-tight">Давтагдах маргаан</h2>
        <p className="mt-3 text-[13.5px] leading-relaxed text-white/60">
          Хэрэглэгчийн маргааны түүх (Dispute rate) нь тухайн фрилансерийн нийтэд харагдах профайл дээр хувиар
          тооцогдож харагдана — маргаан ихтэй хэрэглэгч ил тод болно. Энэ нь давтан маргаантай хэрэглэгчийг
          автоматаар блоклохгүй, харин захиалагчид шийдвэр гаргахад туслах ил тод мэдээлэл өгөх зорилготой.
        </p>
      </div>

      <div className="mt-12 flex flex-wrap gap-3 border-t border-white/8 pt-6">
        <button onClick={() => nav("terms")} className="text-[13px] font-semibold text-brand-soft hover:text-white">
          ← Үйлчилгээний нөхцөл
        </button>
        <button onClick={() => nav("help")} className="text-[13px] font-semibold text-white/50 hover:text-white">
          Тусламжийн төв →
        </button>
      </div>
    </div>
  );
}
