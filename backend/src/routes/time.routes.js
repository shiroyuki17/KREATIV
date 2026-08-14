// Цаг бүртгэл — гэрээн дээр ажилласан цагийг бодитоор хэмжинэ.
//
// Өмнө нь UI-д "42.5h logged / 60h est." гэсэн тоолуур байсан ч ард нь ямар
// ч өгөгдөл байгаагүй: хуудас ачаалах бүрд 42.5 цагаас эхлээд өсдөг
// чимэглэл байлаа. Одоо бодит эхлэл/төгсгөлийн мөчүүдийг хадгална.
//
// Хэмжилтийг ЗӨВХӨН сервер хийнэ. Клиентээс "би 3 цаг ажиллалаа" гэж
// хүлээж авбал цагийг дураараа өсгөх боломжтой болно — цагийн хөлсний
// ажилд энэ нь шууд мөнгө.
import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { rollOverRunningEntries } from '../lib/timeEntries.js';

const router = Router();

/**
 * Гэрээг ачаалж, дуудагч нь ГҮЙЦЭТГЭГЧ мөн эсэхийг шалгана.
 *
 * Цаг бүртгэх эрх зөвхөн freelancer-т байна: захиалагч нөгөө хүний цагийг
 * бүртгэх нь утгагүй бөгөөд төлбөрт нөлөөлнө.
 */
async function loadContractAsFreelancer(userId, contractId) {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    include: { freelancer: { select: { userId: true } } },
  });
  if (!contract) return { error: 404 };
  if (contract.freelancer?.userId !== userId) return { error: 403 };
  return { contract };
}

function secondsOf(entry, now = Date.now()) {
  const end = entry.endedAt ? new Date(entry.endedAt).getTime() : now;
  return Math.max(0, Math.round((end - new Date(entry.startedAt).getTime()) / 1000));
}

function publicEntry(entry) {
  return {
    id: entry.id,
    startedAt: entry.startedAt,
    endedAt: entry.endedAt,
    note: entry.note,
    seconds: secondsOf(entry),
    running: !entry.endedAt,
  };
}

// ── GET /contracts/:id/time ──
// Гэрээний хоёр тал хоёулаа ХАРЖ чадна (захиалагч юунд төлж байгаагаа
// мэдэх ёстой), гэхдээ зөвхөн гүйцэтгэгч бүртгэнэ.
router.get('/contracts/:id/time', requireAuth, async (req, res, next) => {
  try {
    const contract = await prisma.contract.findUnique({
      where: { id: req.params.id },
      include: {
        freelancer: { select: { userId: true } },
        client: { select: { userId: true } },
      },
    });
    if (!contract) return res.status(404).json({ error: 'Олдсонгүй' });

    const isParticipant =
      contract.freelancer?.userId === req.user.id || contract.client?.userId === req.user.id;
    if (!isParticipant) return res.status(403).json({ error: 'Хандах эрхгүй' });

    // Тоолуур гэрээ үүсэх мөчид автоматаар асдаг тул шөнө дундуур гаталсан
    // бүртгэлийг эндээс нөхөж таслана (cron байхгүй — lib/timeEntries.js-ийг үз).
    await rollOverRunningEntries(contract.id);

    const entries = await prisma.timeEntry.findMany({
      where: { contractId: contract.id },
      orderBy: { startedAt: 'desc' },
      take: 100,
    });

    const now = Date.now();
    const totalSeconds = entries.reduce((sum, e) => sum + secondsOf(e, now), 0);

    res.json({
      entries: entries.map(publicEntry),
      totalSeconds,
      running: entries.find((e) => !e.endedAt) ? publicEntry(entries.find((e) => !e.endedAt)) : null,
      canTrack: contract.freelancer?.userId === req.user.id,
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /contracts/:id/time/start ──
router.post('/contracts/:id/time/start', requireAuth, async (req, res, next) => {
  try {
    const { contract, error } = await loadContractAsFreelancer(req.user.id, req.params.id);
    if (error) return res.status(error).json({ error: error === 404 ? 'Олдсонгүй' : 'Хандах эрхгүй' });

    // Дууссан гэрээнд цаг нэмэх нь тооцоог эргүүлэн өөрчилнө.
    if (contract.status !== 'ACTIVE') {
      return res.status(409).json({ error: 'Зөвхөн идэвхтэй гэрээнд цаг бүртгэнэ' });
    }

    // Аль хэдийн ажиллаж байгаа бол шинийг эхлүүлэхгүй — эс тэгвээс хэд хэдэн
    // тоолуур зэрэг явж, нийт цаг бодит хугацаанаас давна.
    const already = await prisma.timeEntry.findFirst({
      where: { contractId: contract.id, endedAt: null },
    });
    if (already) return res.status(409).json({ error: 'Тоолуур аль хэдийн ажиллаж байна', entry: publicEntry(already) });

    const entry = await prisma.timeEntry.create({
      data: {
        contractId: contract.id,
        startedAt: new Date(),
        note: (req.body?.note || '').trim().slice(0, 200) || null,
      },
    });
    res.status(201).json({ entry: publicEntry(entry) });
  } catch (err) {
    next(err);
  }
});

// ── POST /contracts/:id/time/stop ──
router.post('/contracts/:id/time/stop', requireAuth, async (req, res, next) => {
  try {
    const { contract, error } = await loadContractAsFreelancer(req.user.id, req.params.id);
    if (error) return res.status(error).json({ error: error === 404 ? 'Олдсонгүй' : 'Хандах эрхгүй' });

    // Зогсоохоос өмнө өдрийн заагаар тасалсан байх ёстой — эс бөгөөс өчигдөр
    // эхэлсэн тоолуур бүтнээрээ өнөөдрийн бүртгэл болно.
    await rollOverRunningEntries(contract.id);

    const running = await prisma.timeEntry.findFirst({
      where: { contractId: contract.id, endedAt: null },
    });
    if (!running) return res.status(409).json({ error: 'Ажиллаж буй тоолуур алга' });

    const entry = await prisma.timeEntry.update({
      where: { id: running.id },
      data: { endedAt: new Date() },
    });
    res.json({ entry: publicEntry(entry) });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /time/:id ── (буруу бүртгэлийг устгах)
router.delete('/time/:id', requireAuth, async (req, res, next) => {
  try {
    const entry = await prisma.timeEntry.findUnique({
      where: { id: req.params.id },
      include: { contract: { include: { freelancer: { select: { userId: true } } } } },
    });
    if (!entry) return res.status(404).json({ error: 'Олдсонгүй' });
    if (entry.contract.freelancer?.userId !== req.user.id) {
      return res.status(403).json({ error: 'Хандах эрхгүй' });
    }
    await prisma.timeEntry.delete({ where: { id: entry.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
