import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { emitToUser } from '../lib/socket.js';

const router = Router();

// Бусад route-ууд (job/payment/message) энэ функцээр бодит notification
// үүсгэнэ — fire-and-forget байдлаар дуудна (эх үйлдлийг блоклохгүй).
export async function createNotification({ userId, type, text, link }) {
  try {
    const notification = await prisma.notification.create({ data: { userId, type, text, link } });

    // Socket-оор шууд түлхэнэ. Өмнө нь frontend-ийн LiveProvider нь 12
    // секунд тутам /notifications + /messages/unread-count руу poll хийдэг
    // байсан — socket холболт аль хэдийн байгаа мөртлөө нэвтэрсэн
    // хэрэглэгч бүр цагт 600 хүсэлт үүсгэдэг, гэхдээ мэдэгдэл нь 12
    // секунд хүртэл хоцордог гэсэн хамгийн муу хослол байв.
    const unreadCount = await prisma.notification.count({
      where: { userId, read: false },
    });
    emitToUser(userId, 'notification:new', { notification, unreadCount });
  } catch (err) {
    console.error('[notification] үүсгэхэд алдаа гарлаа:', err.message);
  }
}

// ── GET /notifications ──
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.notification.count({ where: { userId: req.user.id, read: false } }),
    ]);
    res.json({ notifications, unreadCount });
  } catch (err) {
    next(err);
  }
});

// ── GET /notifications/unread-count ── (sidebar badge-д зориулсан хөнгөн endpoint)
router.get('/unread-count', requireAuth, async (req, res, next) => {
  try {
    const count = await prisma.notification.count({ where: { userId: req.user.id, read: false } });
    res.json({ count });
  } catch (err) {
    next(err);
  }
});

// ── POST /notifications/:id/read ──
router.post('/:id/read', requireAuth, async (req, res, next) => {
  try {
    const notif = await prisma.notification.findUnique({ where: { id: req.params.id } });
    if (!notif || notif.userId !== req.user.id) return res.status(404).json({ error: 'Олдсонгүй' });
    await prisma.notification.update({ where: { id: notif.id }, data: { read: true } });
    res.json({ message: 'OK' });
  } catch (err) {
    next(err);
  }
});

// ── POST /notifications/read-all ──
router.post('/read-all', requireAuth, async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, read: false },
      data: { read: true },
    });
    res.json({ message: 'OK' });
  } catch (err) {
    next(err);
  }
});

export default router;
