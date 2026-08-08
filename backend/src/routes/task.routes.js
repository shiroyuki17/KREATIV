// FR-3.1: Kanban ажлын самбар — Milestone-с тусдаа, чөлөөтэй нэмэгддэг
// өдөр тутмын to-do картууд. Хоёр тал (client, freelancer) хоёулаа
// үүсгэж/зөөж/устгаж болно — эрх шалгах логик contract.routes.js-тэй ижил.
import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

async function loadContractAsParticipant(req, contractId) {
  const contract = await prisma.contract.findUnique({ where: { id: contractId } });
  if (!contract) return { error: 404 };

  const [clientProfile, freelancerProfile] = await Promise.all([
    prisma.clientProfile.findUnique({ where: { userId: req.user.id } }),
    prisma.freelancerProfile.findUnique({ where: { userId: req.user.id } }),
  ]);
  const isParticipant = contract.clientId === clientProfile?.id || contract.freelancerId === freelancerProfile?.id;
  if (!isParticipant) return { error: 403 };

  return { contract };
}

// ⚠️ Энд `router.use(requireAuth)` БАЙЖ БОЛОХГҮЙ. Энэ router нь app.js-д
// '/' дээр холбогддог тул blanket middleware нь өөрийнх нь route-ууд төдийгүй
// ДАРАА нь бүртгэгдсэн БҮХ root-route-ыг хаана. Үүнээс болж нийтэд нээлттэй
// байх ёстой /plans нь "Token байхгүй" гэж 401 буцааж, GET / нь 404-ийн
// оронд 401 өгдөг байв. Тиймээс requireAuth-ыг route бүрд нь тусад нь өгнө.
// ── GET /contracts/:contractId/tasks ──
router.get('/contracts/:contractId/tasks', requireAuth, async (req, res, next) => {
  try {
    const { error } = await loadContractAsParticipant(req, req.params.contractId);
    if (error) return res.status(error).json({ error: error === 404 ? 'Олдсонгүй' : 'Хандах эрхгүй' });

    const tasks = await prisma.task.findMany({
      where: { contractId: req.params.contractId },
      orderBy: [{ status: 'asc' }, { order: 'asc' }],
    });
    res.json({ tasks });
  } catch (err) {
    next(err);
  }
});

// ── POST /contracts/:contractId/tasks ──
router.post('/contracts/:contractId/tasks', requireAuth, async (req, res, next) => {
  try {
    const { error } = await loadContractAsParticipant(req, req.params.contractId);
    if (error) return res.status(error).json({ error: error === 404 ? 'Олдсонгүй' : 'Хандах эрхгүй' });

    const title = String(req.body.title || '').trim();
    if (!title) return res.status(400).json({ error: 'Гарчиг шаардлагатай' });

    const maxOrder = await prisma.task.aggregate({
      where: { contractId: req.params.contractId, status: 'TODO' },
      _max: { order: true },
    });

    const task = await prisma.task.create({
      data: {
        contractId: req.params.contractId,
        title: title.slice(0, 200),
        description: req.body.description ? String(req.body.description).slice(0, 2000) : null,
        order: (maxOrder._max.order ?? -1) + 1,
        createdBy: req.user.id,
      },
    });
    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
});

// ── PATCH /tasks/:id ── (title/description/status/order)
router.patch('/tasks/:id', requireAuth, async (req, res, next) => {
  try {
    const existing = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Олдсонгүй' });

    const { error } = await loadContractAsParticipant(req, existing.contractId);
    if (error) return res.status(error).json({ error: error === 404 ? 'Олдсонгүй' : 'Хандах эрхгүй' });

    const data = {};
    if (req.body.title !== undefined) data.title = String(req.body.title).trim().slice(0, 200);
    if (req.body.description !== undefined) data.description = req.body.description ? String(req.body.description).slice(0, 2000) : null;
    if (req.body.status !== undefined) {
      if (!['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'].includes(req.body.status)) {
        return res.status(400).json({ error: 'Буруу төлөв' });
      }
      data.status = req.body.status;
    }
    if (req.body.order !== undefined) data.order = Number(req.body.order) || 0;

    const task = await prisma.task.update({ where: { id: req.params.id }, data });
    res.json(task);
  } catch (err) {
    next(err);
  }
});

// ── DELETE /tasks/:id ──
router.delete('/tasks/:id', requireAuth, async (req, res, next) => {
  try {
    const existing = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Олдсонгүй' });

    const { error } = await loadContractAsParticipant(req, existing.contractId);
    if (error) return res.status(error).json({ error: error === 404 ? 'Олдсонгүй' : 'Хандах эрхгүй' });

    await prisma.task.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
