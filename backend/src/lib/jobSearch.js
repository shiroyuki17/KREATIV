// Ажлын хайлтын GANC query.
//
// Өмнө нь энэ логик GET /jobs дотор шууд бичигдсэн байсан. AI хайлт нэмэгдэхэд
// түүнийг хуулбарлах нь хамгийн муу хувилбар байх байсан: хоёр зам тус тусдаа
// хөгжөөд, аль нэгэнд нь `moderationStatus: 'APPROVED'` шүүлт мартагдвал
// модератороос хасагдсан зар AI хайлтаар "гоожих" болно. Тиймээс нэг л
// функцээр гаргаж, хоёулаа үүнийг дуудна.
import prisma from './prisma.js';

const clientInclude = {
  client: { include: { user: { select: { name: true } } } },
  // Саналын ТОО (хэн санал өгснийг БИШ). Нүүр хуудасны "Trending briefs"
  // хэсэг өмнө нь mock-ийн `proposals` талбарыг харуулж, дээр нь тухайн
  // категорийн санамсаргүй хүмүүсийн аватарыг "өргөдөл гаргагчид" мэт
  // харуулдаг байв — тоо нь зохиомол, аватар нь нууцлал зөрчсөн.
  _count: { select: { proposals: true } },
};

export function publicJob(job) {
  return {
    id: job.id,
    title: job.title,
    description: job.description,
    category: job.category,
    skills: job.skills,
    languages: job.languages,
    budgetType: job.budgetType,
    budgetMin: job.budgetMin,
    budgetMax: job.budgetMax,
    status: job.status,
    deadline: job.deadline,
    moderationStatus: job.moderationStatus,
    moderationReason: job.moderationReason,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    proposalCount: job._count?.proposals ?? 0,
    client: job.client && {
      id: job.client.id,
      name: job.client.user?.name,
      orgName: job.client.orgName,
      verifiedPayer: job.client.verifiedPayer,
      ratingAvg: job.client.ratingAvg,
      userId: job.client.userId,
    },
  };
}

/** jobQuerySchema-аар шалгагдсан объектоос Prisma-ийн `where` угсарна. */
export function buildJobWhere(data) {
  // Эдгээр хоёр шүүлт нь ХЭЗЭЭ Ч сонголт биш: нийтэд харагдах хайлт нь
  // зөвхөн модерациар баталгаажсан зарыг л гаргана.
  const and = [{ status: data.status || 'OPEN' }, { moderationStatus: 'APPROVED' }];

  if (data.category) and.push({ category: data.category });
  if (data.type) and.push({ budgetType: data.type });

  if (data.skills) {
    const list = String(data.skills).split(',').map((s) => s.trim()).filter(Boolean);
    if (list.length) and.push({ skills: { hasSome: list } });
  }

  if (data.languages) {
    const list = String(data.languages).split(',').map((s) => s.trim()).filter(Boolean);
    if (list.length) and.push({ languages: { hasSome: list } });
  }

  if (data.q) {
    and.push({
      OR: [
        { title: { contains: data.q, mode: 'insensitive' } },
        { description: { contains: data.q, mode: 'insensitive' } },
      ],
    });
  }

  // Төсвийн шүүлт: хайлтын мужтай давхцаж буй зар бүр тохирно
  if (data.minBudget != null) {
    and.push({ OR: [{ budgetMax: null }, { budgetMax: { gte: data.minBudget } }] });
  }
  if (data.maxBudget != null) {
    and.push({ OR: [{ budgetMin: null }, { budgetMin: { lte: data.maxBudget } }] });
  }

  return { AND: and };
}

/** @returns {Promise<{ jobs, total, page, pageSize, totalPages }>} */
export async function searchJobs(data) {
  const where = buildJobWhere(data);
  const skip = (data.page - 1) * data.pageSize;

  const [jobs, total] = await Promise.all([
    prisma.job.findMany({
      where,
      include: clientInclude,
      orderBy: { createdAt: 'desc' },
      skip,
      take: data.pageSize,
    }),
    prisma.job.count({ where }),
  ]);

  return {
    jobs: jobs.map(publicJob),
    total,
    page: data.page,
    pageSize: data.pageSize,
    totalPages: Math.max(1, Math.ceil(total / data.pageSize)),
  };
}
