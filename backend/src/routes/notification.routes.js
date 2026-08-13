import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { emitToUser } from '../lib/socket.js';

const router = Router();

// Бусад route-ууд (job/payment/message) энэ функцээр бодит notification
// үүсгэнэ — fire-and-forget байдлаар дуудна (эх үйлдлийг блоклохгүй).
// Settings дээрх toggle бүр ЯГ ямар төрлийг хаадаг вэ. Энд байхгүй төрөл
// (payment, review, system) нь заавал хүрэх ёстой мэдэгдэл тул тохиргоогүй —
// мөнгө хөдөлсөн/маргаан шийдэгдсэнийг хэрэглэгч мэдэхгүй байж болохгүй.
const PREF_FOR_TYPE = {
  invite: 'notifyInvites',
  job: 'notifyInvites',
  message: 'notifyMessages',
  milestone: 'notifyMilestones',
};

export async function createNotification({ userId, type, text, link }) {
  try {
    const prefField = PREF_FOR_TYPE[type];
    if (prefField) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { [prefField]: true },
      });
      // Хэрэглэгч тухайн төрлийг хаасан бол мэдэгдэл огт үүсгэхгүй —
      // toggle-ийг зөвхөн хадгалаад нөлөөгүй үлдээвэл өмнөхөөсөө сайн
      // биш, зүгээр л илүү нарийн хууран мэхлэлт болно.
      if (user && user[prefField] === false) return;
    }

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

// ── Мэдэгдлийн тохиргоо ──
// GET /:id гэсэн route байхгүй, PATCH ч өөр байхгүй тул `/prefs`-ийг
// param route-ууд дарах эрсдэлгүй (Express дарааллаар тулгадаг).
const PREF_FIELDS = ['notifyInvites', 'notifyMilestones', 'notifyMessages'];

router.get('/prefs', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { notifyInvites: true, notifyMilestones: true, notifyMessages: true },
    });
    res.json(user || {});
  } catch (err) {
    next(err);
  }
});

// ── PATCH /notifications/prefs ── body: { notifyInvites?, ... }
router.patch('/prefs', requireAuth, async (req, res, next) => {
  try {
    const data = {};
    for (const f of PREF_FIELDS) {
      if (typeof req.body?.[f] === 'boolean') data[f] = req.body[f];
    }
    if (!Object.keys(data).length) {
      return res.status(400).json({ error: 'Шинэчлэх тохиргоо байхгүй' });
    }
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data,
      select: { notifyInvites: true, notifyMilestones: true, notifyMessages: true },
    });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

export default router;
