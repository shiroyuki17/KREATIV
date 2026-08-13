import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { createNotification } from './notification.routes.js';
import { detectLeakage } from '../lib/leakage.js';
import { emitToUser, isUserOnline } from '../lib/socket.js';
import { uploadChatFile } from '../middleware/upload.js';
import { saveUpload } from '../lib/storage.js';

const router = Router();

// userAId/userBId-г үргэлж жижиг ID нь эхэндээ ирэх дарааллаар хадгалдаг тул
// хэн эхлүүлснээс үл хамааран нэг л Conversation row үүсдэг (davхардахгүй).
function canonicalPair(a, b) {
  return a < b ? [a, b] : [b, a];
}

function otherParticipant(conversation, myId) {
  return conversation.userAId === myId ? conversation.userB : conversation.userA;
}

function publicUser(user) {
  return { id: user.id, name: user.name, avatarUrl: user.avatarUrl };
}

/** Хоёр талын аль нэг нь нөгөөгөө блоклосон эсэх. Нэг талын блок хангалттай:
 *  блоклуулсан хүн ч блоклосон руугаа бичиж чадахгүй, эс тэгвээс блок нь
 *  зөвхөн хагасаар ажиллана. */
async function blockExistsBetween(a, b) {
  const found = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: a, blockedId: b },
        { blockerId: b, blockedId: a },
      ],
    },
    select: { blockerId: true },
  });
  return found;
}

function unreadMessageCount(userId) {
  return prisma.message.count({
    where: {
      senderId: { not: userId },
      readAt: null,
      conversation: { OR: [{ userAId: userId }, { userBId: userId }] },
    },
  });
}

function notifyNewMessage(conversation, senderId, message) {
  const recipientId = conversation.userAId === senderId ? conversation.userBId : conversation.userAId;
  // Sidebar-ийн badge яг таг байхын тулд шинэ тоог хамт явуулна — эс тэгвээс
  // frontend нь өөрөө нэмэгдүүлэх ёстой болж, хоёр таб нээлттэй үед эсвэл
  // socket тасарч дахин холбогдоход тоо зөрдөг.
  unreadMessageCount(recipientId)
    .then((unreadCount) =>
      emitToUser(recipientId, 'message:new', {
        conversationId: conversation.id,
        message,
        unreadCount,
      })
    )
    .catch(() => emitToUser(recipientId, 'message:new', { conversationId: conversation.id, message }));
  prisma.user.findUnique({ where: { id: senderId }, select: { name: true } })
    .then((sender) => createNotification({
      userId: recipientId,
      type: 'message',
      text: `${sender?.name || 'Хэрэглэгч'} танд шинэ зурвас илгээлээ`,
      link: 'messages',
    }))
    .catch(() => {});
}

// ── GET /messages/conversations ── (миний бүх харилцан яриа, сүүлийн зурвасаар эрэмбэлсэн)
router.get('/conversations', requireAuth, async (req, res, next) => {
  try {
    const conversations = await prisma.conversation.findMany({
      where: { OR: [{ userAId: req.user.id }, { userBId: req.user.id }] },
      include: {
        userA: { select: { id: true, name: true, avatarUrl: true } },
        userB: { select: { id: true, name: true, avatarUrl: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Блокуудыг нэг удаа татаад санах ойд тулгана — яриа бүрд тусад нь
    // query явуулбал N+1 болно.
    const blocks = await prisma.block.findMany({
      where: { OR: [{ blockerId: req.user.id }, { blockedId: req.user.id }] },
      select: { blockerId: true, blockedId: true },
    });
    const iBlocked = new Set(blocks.filter((b) => b.blockerId === req.user.id).map((b) => b.blockedId));
    const blockedMe = new Set(blocks.filter((b) => b.blockedId === req.user.id).map((b) => b.blockerId));

    // Уншаагүй тоог НЭГ groupBy-гаар бүх ярианд нь тооцно. Өмнө нь яриа
    // тутамд тусдаа count() явуулдаг байсан тул 20 харилцаатай хэрэглэгч
    // хуудсаа нээх бүрд 20 нэмэлт query үүсгэдэг байв (N+1).
    const unreadRows = await prisma.message.groupBy({
      by: ['conversationId'],
      where: {
        conversationId: { in: conversations.map((c) => c.id) },
        senderId: { not: req.user.id },
        readAt: null,
      },
      _count: { _all: true },
    });
    const unreadByConversation = new Map(
      unreadRows.map((r) => [r.conversationId, r._count._all])
    );

    const withUnread = conversations.map((c) => {
      const unread = unreadByConversation.get(c.id) || 0;
      const other = otherParticipant(c, req.user.id);
      return {
        id: c.id,
        with: {
          ...publicUser(other),
          // Блоклосон хүнийхээ онлайн төлөвийг харуулахгүй — блок нь
          // харилцаа таслах гэсэн үг, зөвхөн зурвас хориглох биш.
          online: iBlocked.has(other.id) || blockedMe.has(other.id) ? false : isUserOnline(other.id),
          blockedByMe: iBlocked.has(other.id),
          hasBlockedMe: blockedMe.has(other.id),
        },
        lastMessage: c.messages[0] || null,
        unread,
        updatedAt: c.updatedAt,
      };
    });

    res.json({ conversations: withUnread });
  } catch (err) {
    next(err);
  }
});

// ── POST /messages/conversations ── (get-or-create, body: { userId }) ──
router.post('/conversations', requireAuth, async (req, res, next) => {
  try {
    const otherUserId = req.body?.userId;
    if (!otherUserId || otherUserId === req.user.id) {
      return res.status(400).json({ error: 'Буруу хэрэглэгч' });
    }
    const other = await prisma.user.findUnique({ where: { id: otherUserId }, select: { id: true, name: true, avatarUrl: true } });
    if (!other) return res.status(404).json({ error: 'Хэрэглэгч олдсонгүй' });

    const block = await blockExistsBetween(req.user.id, otherUserId);
    if (block) {
      return res.status(403).json({
        error: block.blockerId === req.user.id
          ? 'Та энэ хэрэглэгчийг блоклосон байна'
          : 'Энэ хэрэглэгчтэй харилцах боломжгүй',
      });
    }

    const [userAId, userBId] = canonicalPair(req.user.id, otherUserId);
    const conversation = await prisma.conversation.upsert({
      where: { userAId_userBId: { userAId, userBId } },
      update: {},
      create: { userAId, userBId },
    });

    res.json({ id: conversation.id, with: other });
  } catch (err) {
    next(err);
  }
});

// ── GET /messages/conversations/:id/messages ── (thread — уншсанаар тэмдэглэнэ)
router.get('/conversations/:id/messages', requireAuth, async (req, res, next) => {
  try {
    const conversation = await prisma.conversation.findUnique({ where: { id: req.params.id } });
    if (!conversation || (conversation.userAId !== req.user.id && conversation.userBId !== req.user.id)) {
      return res.status(404).json({ error: 'Олдсонгүй' });
    }

    const messages = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
    });

    await prisma.message.updateMany({
      where: { conversationId: conversation.id, senderId: { not: req.user.id }, readAt: null },
      data: { readAt: new Date() },
    });

    res.json({ messages });
  } catch (err) {
    next(err);
  }
});

// ── POST /messages/conversations/:id/messages ── (зурвас илгээх)
router.post('/conversations/:id/messages', requireAuth, async (req, res, next) => {
  try {
    const text = (req.body?.text || '').trim();
    if (!text) return res.status(400).json({ error: 'Зурвас хоосон байна' });
    if (text.length > 4000) return res.status(400).json({ error: 'Зурвас хэт урт байна' });

    const conversation = await prisma.conversation.findUnique({ where: { id: req.params.id } });
    if (!conversation || (conversation.userAId !== req.user.id && conversation.userBId !== req.user.id)) {
      return res.status(404).json({ error: 'Олдсонгүй' });
    }

    const peerId = conversation.userAId === req.user.id ? conversation.userBId : conversation.userAId;
    const block = await blockExistsBetween(req.user.id, peerId);
    if (block) {
      return res.status(403).json({
        error: block.blockerId === req.user.id
          ? 'Та энэ хэрэглэгчийг блоклосон байна — блокоо цуцалж зурвас илгээнэ үү'
          : 'Энэ хэрэглэгч рүү зурвас илгээх боломжгүй',
      });
    }

    const { flagged, reasons } = detectLeakage(text);
    const message = await prisma.message.create({
      data: { conversationId: conversation.id, senderId: req.user.id, text, flagged },
    });
    await prisma.conversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } });

    res.status(201).json({ ...message, leakageWarning: flagged ? reasons : null });
    notifyNewMessage(conversation, req.user.id, message);
  } catch (err) {
    next(err);
  }
});

// ── POST /messages/conversations/:id/attachments ── (FR-2.1 — файл хавсаргах)
router.post('/conversations/:id/attachments', requireAuth, (req, res, next) => {
  uploadChatFile(req, res, async (err) => {
    if (err) {
      const message = err.code === 'LIMIT_FILE_SIZE'
        ? 'Файлын хэмжээ 15MB-с ихгүй байх ёстой'
        : err.message || 'Файл хавсаргахад алдаа гарлаа';
      return res.status(400).json({ error: message });
    }
    if (!req.file) return res.status(400).json({ error: 'Файл сонгогдоогүй байна' });

    try {
      const conversation = await prisma.conversation.findUnique({ where: { id: req.params.id } });
      if (!conversation || (conversation.userAId !== req.user.id && conversation.userBId !== req.user.id)) {
        return res.status(404).json({ error: 'Олдсонгүй' });
      }

      const peerId = conversation.userAId === req.user.id ? conversation.userBId : conversation.userAId;
      if (await blockExistsBetween(req.user.id, peerId)) {
        return res.status(403).json({ error: 'Энэ хэрэглэгч рүү файл илгээх боломжгүй' });
      }

      const fileUrl = await saveUpload('chat', req.user.id, req.file);
      const message = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: req.user.id,
          text: '',
          fileUrl,
          fileName: req.file.originalname,
          fileType: req.file.mimetype,
          fileSize: req.file.size,
        },
      });
      await prisma.conversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } });

      res.status(201).json(message);
      notifyNewMessage(conversation, req.user.id, message);
    } catch (e) {
      next(e);
    }
  });
});

// ── GET /messages/people?q= ── (шинэ чат эхлүүлэхийн тулд хүн хайх)
//
// Хайлтын талбар өмнө нь ЗӨВХӨН одоо байгаа яриануудыг шүүдэг байсан тул
// шинэ хэрэглэгчтэй чат эхлүүлэх ямар ч зам байсангүй: яриа 0 байхад юу
// бичсэн ч "No results found" гардаг байв.
router.get('/people', requireAuth, async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim();
    if (q.length < 2) return res.json({ people: [] });

    // Блоклосон/блоклуулсан хүмүүсийг хайлтаас бүрэн хасна.
    const blocks = await prisma.block.findMany({
      where: { OR: [{ blockerId: req.user.id }, { blockedId: req.user.id }] },
      select: { blockerId: true, blockedId: true },
    });
    const hidden = new Set(blocks.flatMap((b) => [b.blockerId, b.blockedId]));
    hidden.add(req.user.id);

    const users = await prisma.user.findMany({
      where: {
        name: { contains: q, mode: 'insensitive' },
        isActive: true,
        id: { notIn: [...hidden] },
      },
      select: { id: true, name: true, avatarUrl: true },
      take: 8,
      orderBy: { name: 'asc' },
    });

    res.json({ people: users });
  } catch (err) {
    next(err);
  }
});

// ── POST /messages/blocks ── (хэрэглэгч блоклох, body: { userId })
router.post('/blocks', requireAuth, async (req, res, next) => {
  try {
    const targetId = req.body?.userId;
    if (!targetId || targetId === req.user.id) {
      return res.status(400).json({ error: 'Буруу хэрэглэгч' });
    }
    const target = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true } });
    if (!target) return res.status(404).json({ error: 'Хэрэглэгч олдсонгүй' });

    // upsert — давхар дарахад 409 өгөхгүй, дүн нь ижил (idempotent).
    await prisma.block.upsert({
      where: { blockerId_blockedId: { blockerId: req.user.id, blockedId: targetId } },
      update: {},
      create: { blockerId: req.user.id, blockedId: targetId },
    });
    res.status(201).json({ blocked: true, userId: targetId });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /messages/blocks/:userId ── (блок цуцлах)
router.delete('/blocks/:userId', requireAuth, async (req, res, next) => {
  try {
    await prisma.block.deleteMany({
      where: { blockerId: req.user.id, blockedId: req.params.userId },
    });
    res.json({ blocked: false, userId: req.params.userId });
  } catch (err) {
    next(err);
  }
});

// ── GET /messages/unread-count ── (sidebar badge)
router.get('/unread-count', requireAuth, async (req, res, next) => {
  try {
    const count = await prisma.message.count({
      where: {
        senderId: { not: req.user.id },
        readAt: null,
        conversation: { OR: [{ userAId: req.user.id }, { userBId: req.user.id }] },
      },
    });
    res.json({ count });
  } catch (err) {
    next(err);
  }
});

export default router;
