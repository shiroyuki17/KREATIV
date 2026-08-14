// Холбоо барих формын хүлээн авагч.
//
// Өмнө нь Contact.jsx-ийн "Send message" товч нь `setSent(true)` гэж
// төлөв солихоос өөр юу ч хийдэггүй байв: хэрэглэгч зурвасаа бичээд
// "Message sent" гэсэн баталгаа хараад явдаг, зурвас нь хаана ч очдоггүй.
// Одоо эхлээд өгөгдлийн санд хадгалж (энэ нь амжилтгүй бол хэрэглэгчид
// алдаа хэлнэ), дараа нь имэйлээр мэдэгдэнэ.
import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { sendMail } from '../lib/mailer.js';
import { config } from '../config/env.js';
import { authLimiter } from '../middleware/rateLimit.js';

const router = Router();

// Сэдвийн жагсаалт нь frontend-тэй нийлдэг ТОГТМОЛ утга (орчуулга нь
// зөвхөн шошго дээр) — ингэснээр админ ямар хэл дээр бичсэнээс үл хамаарч
// нэг ижил байдлаар шүүж чадна.
const TOPICS = ['general', 'billing', 'trust', 'partnership', 'press'];

const contactSchema = z.object({
  name: z.string().trim().min(2, 'Нэрээ бичнэ үү').max(120),
  email: z.email('Имэйл буруу байна'),
  topic: z.enum(TOPICS),
  message: z.string().trim().min(10, 'Зурвас дор хаяж 10 тэмдэгт байх ёстой').max(4000),
});

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

// ── POST /support/contact ── (нээлттэй — бүртгэлгүй хүн ч бичиж чадна.
// authLimiter-ээр хамгаалагдсан: нэвтрэх оролдлоготой ижил давтамжийн
// хязгаартай тул спам ботоор үерлүүлэх боломжгүй.)
router.post('/contact', authLimiter, async (req, res, next) => {
  try {
    const parsed = contactSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues.map((i) => i.message) });
    }
    const data = parsed.data;

    const saved = await prisma.supportMessage.create({ data });

    // Имэйл нь fire-and-forget — хадгалсан тул алдагдахгүй, зөвхөн
    // мэдэгдэл хоцорно. Хүлээхгүй (await), хариуг саатуулах шаардлагагүй.
    const to = config.SUPPORT_EMAIL || config.ADMIN_EMAIL;
    if (to) {
      sendMail({
        to,
        subject: `[KREATIV] ${data.topic} — ${data.name}`,
        html: `<p><b>Хэнээс:</b> ${escapeHtml(data.name)} &lt;${escapeHtml(data.email)}&gt;</p>
<p><b>Сэдэв:</b> ${escapeHtml(data.topic)}</p>
<hr>
<p style="white-space:pre-wrap">${escapeHtml(data.message)}</p>`,
      });
    }

    res.status(201).json({ id: saved.id });
  } catch (err) {
    next(err);
  }
});

export default router;
