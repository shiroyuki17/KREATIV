// Цагийн бүртгэлийн дүрмүүд — тоолуур автоматаар эхлэх, өдөр бүр шөнө дунд
// таслагдах.
//
// Яагаад cron биш вэ: Render-ийн free tier-д cron/Shell байхгүй бөгөөд web
// service нь идэвхгүй үед унтардаг (reconcile.js-д ижил шалтгаанаар lazy
// арга сонгосон). Тиймээс "шөнө дунд хаах" ажлыг ЦАГ УНШИХ/БИЧИХ бүрд
// нөхөж гүйцээнэ: тухайн гэрээний ажиллаж буй бүртгэл өнгөрсөн өдрөөс
// эхэлсэн байвал тэр өдрийн төгсгөлд хааж, шинэ өдрийн бүртгэл нээнэ.
// Үр дүн нь cron ажилласантай ижил — зөвхөн хойшлуулж гүйцэтгэнэ.
import prisma from './prisma.js';
import { config } from './../config/env.js';

// Хэрэглэгчид Монголд байгаа тул "өдөр" гэдэг нь UB-ийн өдөр. Сервер нь
// Render дээр UTC-ээр ажилладаг тул серверийн шөнө дунд ашиглавал бүртгэл
// нь орой 08:00 цагт таслагдана.
const TZ = config.TIME_ZONE;

// Нэг гэрээ нэг жилээс удаан ажиллах нь бодит биш — гогцоо хязгааргүй
// эргэхээс сэргийлнэ (жишээ нь эвдэрсэн огноотой бүртгэл таарвал).
const MAX_ROLLOVER_DAYS = 400;

/**
 * Тухайн агшинд TZ ба UTC хоёрын зөрүү (мс).
 *
 * Intl-ээс өөр найдвартай эх сурвалж байхгүй — сервер ямар ч TZ дээр
 * ажиллаж болно (dev дээр UB, Render дээр UTC) тул процессын өөрийнх нь
 * бүсээс хамаарах getHours() зэргийг ашиглаж БОЛОХГҮЙ.
 */
function tzOffsetMs(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
    .formatToParts(date)
    .reduce((acc, p) => (p.type === 'literal' ? acc : { ...acc, [p.type]: p.value }), {});

  // hour нь hour12:false үед 24 гэж гарч болно (шөнө дунд) — 0 болгоно.
  const asIfUtc = Date.UTC(
    Number(parts.year), Number(parts.month) - 1, Number(parts.day),
    Number(parts.hour) % 24, Number(parts.minute), Number(parts.second),
  );
  // Секундын нарийвчлалд тэгшитгэнэ — Intl миллисекунд буцаадаггүй.
  return asIfUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** `date`-ээс хойших ХАМГИЙН ОЙРЫН локал шөнө дунд (UTC агшин болгож). */
export function nextLocalMidnight(date) {
  const offset = tzOffsetMs(date);
  // Локал ханан дээрх цагийг UTC мэт төлөөлүүлж, дараагийн өдрийн 00:00-г олно.
  const wall = new Date(date.getTime() + offset);
  const nextWall = Date.UTC(wall.getUTCFullYear(), wall.getUTCMonth(), wall.getUTCDate() + 1);

  let utc = nextWall - offset;
  // Зуны цагийн шилжилт дээр зөрүү өөрчлөгдвөл нэг удаа залруулна. Монголд
  // одоогоор DST байхгүй ч TIME_ZONE-ыг өөр бүс рүү солиход зөв ажиллана.
  const offsetThen = tzOffsetMs(new Date(utc));
  if (offsetThen !== offset) utc = nextWall - offsetThen;
  return new Date(utc);
}

/**
 * Гэрээнд ажиллаж буй тоолуурыг өдрийн заагаар тасалж, өнөөдөр рүү авчирна.
 *
 * Гэрээ ИДЭВХТЭЙ бол шинэ өдрийн тоолуур үргэлжлүүлж нээнэ; дууссан/цуцлагдсан
 * бол зөвхөн хааж, дахин нээхгүй — дууссан гэрээнд цаг нэмэгдвэл тооцоо
 * эргэж өөрчлөгдөнө.
 *
 * @returns {Promise<boolean>} ямар нэг өөрчлөлт хийсэн эсэх
 */
export async function rollOverRunningEntries(contractId, now = new Date()) {
  let entry = await prisma.timeEntry.findFirst({
    where: { contractId, endedAt: null },
    orderBy: { startedAt: 'asc' },
  });
  if (!entry) return false;

  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    select: { status: true },
  });
  const keepRunning = contract?.status === 'ACTIVE';

  let changed = false;
  for (let i = 0; i < MAX_ROLLOVER_DAYS; i++) {
    const boundary = nextLocalMidnight(new Date(entry.startedAt));
    if (boundary > now) break;

    await prisma.timeEntry.update({ where: { id: entry.id }, data: { endedAt: boundary } });
    changed = true;
    if (!keepRunning) return true;

    entry = await prisma.timeEntry.create({
      data: { contractId, startedAt: boundary, note: entry.note },
    });
  }
  return changed;
}

/**
 * Гэрээнд тоолуур эхлүүлнэ — аль хэдийн ажиллаж байвал юу ч хийхгүй.
 *
 * Гэрээ үүсэх мөчид дуудагдана: фрилансер ажлаа авмагц тоолуур явж эхлэх
 * ёстой бөгөөд "Start дарахаа мартсан" гэсэн шалтгаанаар цаг алдагдахгүй.
 * Гэрээ үүсгэх гүйлгээг унагахгүйн тулд дуудагч тал алдааг залгина.
 */
export async function ensureTimerRunning(contractId, startedAt = new Date()) {
  const running = await prisma.timeEntry.findFirst({
    where: { contractId, endedAt: null },
  });
  if (running) return running;
  return prisma.timeEntry.create({ data: { contractId, startedAt } });
}
