import prisma from '../lib/prisma.js';

// ABAC (Day 6): RBAC (role) болон ownership-ээс (client/freelancer profile
// эзэмшдэг эсэх) гадна, НӨӨЦИЙН ТӨЛӨВ (attribute) дээр суурилсан дүрмүүд.
// Жишээ нь: эзэмшигч байсан ч хаагдсан зарыг засах, идэвхгүй акаунт
// шинэ зар нийтлэх боломжгүй — эдгээр нь role-оос үл хамаарна.

// Attribute: user.isActive — JWT-д isActive ороогүй тул богино хугацаанд
// (access token 15мин) идэвхгүй болсон акаунт хуучин токеноороо мутаци хийж
// чадахгүй байхын тулд мэдрэмтгий route дээр дахин DB-ээс шалгана.
export async function requireActiveUser(req, res, next) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { isActive: true } });
    if (!user || !user.isActive) {
      return res.status(403).json({ error: 'Таны акаунт идэвхгүй болгогдсон байна' });
    }
    next();
  } catch (err) {
    next(err);
  }
}

// Attribute: job.status — терминал төлөвт (CLOSED/CANCELLED) орсон зарыг
// эзэмшигч нь ч засах ёсгүй (аль хэдийн шийдэгдсэн гэрээ мэт).
export function jobEditBlockReason(job) {
  if (job.status === 'CLOSED' || job.status === 'CANCELLED') {
    return 'Хаагдсан эсвэл цуцлагдсан зарыг засах боломжгүй';
  }
  return null;
}

// Attribute: job.status === IN_PROGRESS — идэвхтэй гэрээтэй зарыг устгаж
// болохгүй (хамтран ажиллаж буй freelancer-т нөлөөлнө), эхлээд цуцлах ёстой.
export function jobDeleteBlockReason(job) {
  if (job.status === 'IN_PROGRESS') {
    return 'Хийгдэж буй (IN_PROGRESS) зарыг устгах боломжгүй — эхлээд цуцална уу';
  }
  return null;
}
