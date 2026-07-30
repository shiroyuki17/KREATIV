import { verifyAccessToken } from '../utils/jwt.js';
import prisma from '../lib/prisma.js';

// Bearer token-ийг шалгаж, req.user-д хэрэглэгчийн мэдээллийг хийнэ
export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token байхгүй' });
  }

  const token = header.slice(7);
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    return res.status(401).json({ error: 'Token хүчингүй эсвэл хугацаа дууссан' });
  }
}

// Тодорхой role шаардах middleware (жишээ: зөвхөн ADMIN)
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Хандах эрхгүй' });
    }
    next();
  };
}

// RBAC: зөвхөн ClientProfile-той хэрэглэгч л ажлын зар нийтэлж чадна (FR-2).
// req.clientProfile-д олдсон профайлыг хийнэ — дараагийн handler дахин
// query хийхгүй байхын тулд.
export async function requireClientProfile(req, res, next) {
  try {
    const profile = await prisma.clientProfile.findUnique({ where: { userId: req.user.id } });
    if (!profile) {
      return res.status(403).json({ error: 'Зар нийтлэхийн тулд эхлээд client профайлаа үүсгэнэ үү' });
    }
    req.clientProfile = profile;
    next();
  } catch (err) {
    next(err);
  }
}