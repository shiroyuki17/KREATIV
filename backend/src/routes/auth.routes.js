import crypto from 'crypto';
import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { config } from '../config/env.js';
import { sendMail } from '../lib/mailer.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
} from '../utils/jwt.js';
import { requireAuth } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  phoneOtpRequestSchema,
  phoneOtpVerifySchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validators/auth.schema.js';

const router = Router();

// Body-г zod-оор шалгах туслах
function validate(schema, body) {
  const result = schema.safeParse(body);
  if (!result.success) {
    return { error: result.error.issues.map((i) => i.message) };
  }
  return { data: result.data };
}

// Refresh token үүсгээд DB-д hash хадгалах
async function issueRefreshToken(userId) {
  const token = signRefreshToken({ sub: userId });
  const expiresAt = new Date(
    Date.now() + config.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000
  );
  await prisma.refreshToken.create({
    data: { tokenHash: hashToken(token), userId, expiresAt },
  });
  return token;
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    phoneVerifiedAt: user.phoneVerifiedAt,
    avatarUrl: user.avatarUrl,
    role: user.role,
  };
}

const OTP_TTL_MINUTES = 10;

// ── POST /register ──
router.post('/register', authLimiter, async (req, res, next) => {
  try {
    const { data, error } = validate(registerSchema, req.body);
    if (error) return res.status(400).json({ error });

    const emailTaken = await prisma.user.findUnique({ where: { email: data.email } });
    if (emailTaken) {
      return res.status(409).json({ error: 'Имэйл аль хэдийн бүртгэгдсэн' });
    }
    if (data.phone) {
      const phoneTaken = await prisma.user.findUnique({ where: { phone: data.phone } });
      if (phoneTaken) {
        return res.status(409).json({ error: 'Утасны дугаар аль хэдийн бүртгэгдсэн' });
      }
    }

    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash: await hashPassword(data.password),
        name: data.name,
        phone: data.phone,
      },
    });

    const accessToken = signAccessToken({ sub: user.id, role: user.role });
    const refreshToken = await issueRefreshToken(user.id);

    res.status(201).json({ user: publicUser(user), accessToken, refreshToken });

    // Хариултын дараа илгээнэ (fire-and-forget) — имэйл удаашрал/алдаа
    // бүртгэлийн хариултыг хойшлуулах ёсгүй.
    sendMail({
      to: user.email,
      subject: 'Тавтай морил KREATIV-д!',
      html: `<p>Сайн байна уу, ${user.name || 'найз'}!</p><p>KREATIV дээр бүртгэл амжилттай үүслээ. Одоо профайлаа бөглөж, ажил хайж эсвэл зар нийтэлж эхэлж болно.</p>`,
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /login ──
router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { data, error } = validate(loginSchema, req.body);
    if (error) return res.status(400).json({ error });

    const user = await prisma.user.findUnique({ where: { email: data.email } });
    // Хэрэглэгч байхгүй эсвэл зөвхөн Google-ээр бүртгүүлсэн (нууц үггүй) ч
    // ижил алдаа буцаана (account enumeration-аас сэргийлнэ)
    if (!user || !user.isActive || !user.passwordHash) {
      return res.status(401).json({ error: 'Имэйл эсвэл нууц үг буруу' });
    }

    const ok = await verifyPassword(data.password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: 'Имэйл эсвэл нууц үг буруу' });
    }

    const accessToken = signAccessToken({ sub: user.id, role: user.role });
    const refreshToken = await issueRefreshToken(user.id);

    res.json({ user: publicUser(user), accessToken, refreshToken });
  } catch (err) {
    next(err);
  }
});

// ── POST /refresh ── (шинэ access token авах)
router.post('/refresh', authLimiter, async (req, res, next) => {
  try {
    const { data, error } = validate(refreshSchema, req.body);
    if (error) return res.status(400).json({ error });

    let payload;
    try {
      payload = verifyRefreshToken(data.refreshToken);
    } catch {
      return res.status(401).json({ error: 'Refresh token хүчингүй' });
    }

    const tokenHash = hashToken(data.refreshToken);
    const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!stored || stored.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Refresh token хүчингүй эсвэл дууссан' });
    }
    if (stored.revoked) {
      // Аль хэдийн rotate хийгдсэн (нэг удаа хэрэглэгдсэн) token дахин ирвэл
      // хулгайлагдсан байх магадлалтай — тухайн хэрэглэгчийн БҮХ session-ийг
      // хүчингүй болгож, дахин нэвтрэхийг шаардана.
      await prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revoked: false },
        data: { revoked: true },
      });
      return res.status(401).json({ error: 'Session-д асуудал илэрсэн тул бүх төхөөрөмжөөс гарлаа. Дахин нэвтэрнэ үү.' });
    }

    // Token rotation: хуучныг хүчингүй болгож, шинийг өгнө
    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revoked: true },
    });

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Хэрэглэгч идэвхгүй' });
    }

    const accessToken = signAccessToken({ sub: user.id, role: user.role });
    const refreshToken = await issueRefreshToken(user.id);

    res.json({ accessToken, refreshToken });
  } catch (err) {
    next(err);
  }
});

// ── GET /auth/sessions ── (бодит идэвхтэй session-ууд)
//
// Settings дээр өмнө нь "Windows · Chrome · Ulaanbaatar" гэсэн хатуу
// бичсэн мөр байсан — хэрэглэгч ямар ч төхөөрөмжөөс орсон байсан ижил
// харагдана. Бодит эх сурвалж нь RefreshToken: session тутамд нэг мөр.
//
// User-Agent/IP-г хадгалдаггүй тул төхөөрөмжийн нэр зохиохгүй — зөвхөн
// бодитоор мэдэх зүйлээ (хэзээ нэвтэрсэн, хэзээ дуусах) харуулна.
router.get('/sessions', requireAuth, async (req, res, next) => {
  try {
    const rows = await prisma.refreshToken.findMany({
      where: { userId: req.user.id, revoked: false, expiresAt: { gt: new Date() } },
      select: { id: true, createdAt: true, expiresAt: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ sessions: rows });
  } catch (err) {
    next(err);
  }
});

// ── POST /auth/sessions/revoke-others ── body: { refreshToken }
// Бусад бүх төхөөрөмжөөс гаргана. Аль нь "энэ төхөөрөмж" гэдгийг сервер
// өөрөө мэдэх аргагүй тул клиент өөрийн refresh token-ыг илгээж, түүнээс
// бусдыг хүчингүй болгоно (токен нь аль хэдийн клиентийн гарт байгаа тул
// нэмэлт эрсдэл үүсгэхгүй).
router.post('/sessions/revoke-others', requireAuth, async (req, res, next) => {
  try {
    const { data, error } = validate(refreshSchema, req.body);
    if (error) return res.status(400).json({ error });

    const keepHash = hashToken(data.refreshToken);
    const result = await prisma.refreshToken.updateMany({
      where: { userId: req.user.id, revoked: false, tokenHash: { not: keepHash } },
      data: { revoked: true },
    });
    res.json({ revoked: result.count });
  } catch (err) {
    next(err);
  }
});

// ── POST /logout ── (refresh token-ийг хүчингүй болгох)
router.post('/logout', async (req, res, next) => {
  try {
    const { data, error } = validate(refreshSchema, req.body);
    if (error) return res.status(400).json({ error });

    await prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(data.refreshToken) },
      data: { revoked: true },
    });
    res.json({ message: 'Гарлаа' });
  } catch (err) {
    next(err);
  }
});

const RESET_TTL_MINUTES = 30;

// ── POST /forgot-password ──
// Account enumeration-аас сэргийлж, имэйл бүртгэлтэй эсэхээс үл хамааран
// ЯГ ИЖИЛ хариу буцаана — зурвасын агуулгаас (илгээсэн эсэх) мэдэхгүй.
router.post('/forgot-password', authLimiter, async (req, res, next) => {
  try {
    const { data, error } = validate(forgotPasswordSchema, req.body);
    if (error) return res.status(400).json({ error });

    const user = await prisma.user.findUnique({ where: { email: data.email } });
    // Google-ээр л бүртгүүлсэн (нууц үггүй) хэрэглэгчид сэргээх нууц үг
    // байхгүй тул энд ч бас алгасна — гэхдээ хариу ижилхэн.
    if (user && user.passwordHash) {
      const token = crypto.randomBytes(32).toString('hex');
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetHash: hashToken(token),
          passwordResetExpiresAt: new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000),
        },
      });
      const link = `${config.FRONTEND_URL}/#/reset-password?token=${token}`;
      sendMail({
        to: user.email,
        subject: 'KREATIV — нууц үг сэргээх',
        html: `<p>Сайн байна уу, ${user.name || 'найз'}!</p><p>Нууц үгээ сэргээхийн тулд доорх холбоос дээр дарна уу (${RESET_TTL_MINUTES} минутын дотор хүчинтэй):</p><p><a href="${link}">${link}</a></p><p>Хэрэв та энэ хүсэлтийг илгээгээгүй бол энэ имэйлийг үл тоомсорлоно уу.</p>`,
      });
    }

    res.json({ message: 'Хэрэв энэ имэйл бүртгэлтэй бол сэргээх холбоос илгээгдлээ.' });
  } catch (err) {
    next(err);
  }
});

// ── POST /reset-password ──
router.post('/reset-password', authLimiter, async (req, res, next) => {
  try {
    const { data, error } = validate(resetPasswordSchema, req.body);
    if (error) return res.status(400).json({ error });

    const user = await prisma.user.findFirst({
      where: { passwordResetHash: hashToken(data.token) },
    });
    if (!user || !user.passwordResetExpiresAt || user.passwordResetExpiresAt < new Date()) {
      return res.status(400).json({ error: 'Холбоос хүчингүй эсвэл хугацаа дууссан. Дахин хүснэ үү.' });
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: await hashPassword(data.password),
          passwordResetHash: null,
          passwordResetExpiresAt: null,
        },
      }),
      // Аюулгүй байдлын үүднээс бүх session-ийг хүчингүй болгоно — нууц үг
      // алдагдсан байж болзошгүй тул хуучин refresh token-ууд ажиллахгүй.
      prisma.refreshToken.updateMany({
        where: { userId: user.id, revoked: false },
        data: { revoked: true },
      }),
    ]);

    res.json({ message: 'Нууц үг амжилттай солигдлоо. Одоо шинэ нууц үгээрээ нэвтэрнэ үү.' });
  } catch (err) {
    next(err);
  }
});

// ── GET /me ── (хамгаалагдсан route)
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        phoneVerifiedAt: true,
        avatarUrl: true,
        role: true,
        createdAt: true,
        // Хэрэглэгч freelancer/client горимоо өөрөө сольдог болсон тул
        // (AppShell-ийн "Switch to …") аль профайл нь аль хэдийн үүссэнийг
        // мэдэх шаардлагатай. Профайл байхгүй горим руу шилжихэд эхлээд
        // onboarding руу оруулна. `select` дотор тоолсноор нэмэлт хоёр
        // round-trip хийхгүйгээр /auth/me-д шууд ирнэ.
        freelancerProfile: { select: { id: true } },
        clientProfile: { select: { id: true } },
      },
    });
    if (!user) return res.status(404).json({ error: 'Олдсонгүй' });

    const { freelancerProfile, clientProfile, ...rest } = user;
    res.json({
      ...rest,
      hasFreelancerProfile: !!freelancerProfile,
      hasClientProfile: !!clientProfile,
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /auth/phone/request-otp ── (FR-1.1, демо горим)
router.post('/phone/request-otp', requireAuth, authLimiter, async (req, res, next) => {
  try {
    const { data, error } = validate(phoneOtpRequestSchema, req.body);
    if (error) return res.status(400).json({ error });

    const taken = await prisma.user.findFirst({ where: { phone: data.phone, id: { not: req.user.id } } });
    if (taken) return res.status(409).json({ error: 'Утасны дугаар аль хэдийн бүртгэгдсэн' });

    const code = String(Math.floor(100000 + Math.random() * 900000));
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        phone: data.phone,
        phoneOtpHash: await hashPassword(code),
        phoneOtpExpiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000),
      },
    });

    // Демо горим: жинхэнэ SMS gateway байхгүй тул console-руу "илгээгээд",
    // хариултад буцаана (sendMail-ийн demo-mode загвартай ижил).
    console.log(`[demo SMS] ${data.phone} → таны KREATIV баталгаажуулах код: ${code}`);

    res.json({ message: 'Код илгээгдлээ', expiresInMinutes: OTP_TTL_MINUTES, demoCode: code });
  } catch (err) {
    next(err);
  }
});

// ── POST /auth/phone/verify-otp ──
router.post('/phone/verify-otp', requireAuth, authLimiter, async (req, res, next) => {
  try {
    const { data, error } = validate(phoneOtpVerifySchema, req.body);
    if (error) return res.status(400).json({ error });

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user.phoneOtpHash || !user.phoneOtpExpiresAt || user.phoneOtpExpiresAt < new Date() || user.phone !== data.phone) {
      return res.status(400).json({ error: 'Код хүчингүй эсвэл хугацаа дууссан. Дахин хүснэ үү.' });
    }
    const ok = await verifyPassword(data.code, user.phoneOtpHash);
    if (!ok) return res.status(400).json({ error: 'Код буруу байна' });

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { phoneVerifiedAt: new Date(), phoneOtpHash: null, phoneOtpExpiresAt: null },
    });

    res.json(publicUser(updated));
  } catch (err) {
    next(err);
  }
});

export default router;