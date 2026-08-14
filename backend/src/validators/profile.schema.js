import { z } from 'zod';

// Job-ийн category-тэй ижил жагсаалт — Find Talent-ийн шүүлт Find Work-тэй
// нэгдсэн ойлголт хэрэглэдэг байхын тулд.
export const FREELANCER_CATEGORIES = ['Design', 'Dev', 'AI', 'Motion', 'Writing', 'Marketing'];

export const freelancerProfileSchema = z
  .object({
    headline: z.string().max(120).optional(),
    bio: z.string().max(2000).optional(),
    category: z.enum(FREELANCER_CATEGORIES).optional(),
    skills: z.array(z.string().min(1)).max(30).optional(),
    priceMin: z.coerce.number().int().nonnegative().optional(),
    priceMax: z.coerce.number().int().nonnegative().optional(),
    availability: z.enum(['OPEN', 'BUSY', 'CLOSED']).optional(),
  })
  .refine(
    (d) => d.priceMin == null || d.priceMax == null || d.priceMin <= d.priceMax,
    { message: 'priceMin нь priceMax-аас их байж болохгүй', path: ['priceMin'] }
  );

export const freelancerQuerySchema = z.object({
  q: z.string().max(200).optional(),
  category: z.enum(FREELANCER_CATEGORIES).optional(),
  skills: z.string().optional(), // таслалаар тусгаарласан
  sort: z.enum(['relevant', 'rateLow', 'rateHigh', 'rating']).default('relevant'),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(50).default(12),
});

export const clientProfileSchema = z.object({
  orgName: z.string().max(120).optional(),
  contactRole: z.string().max(120).optional(),
  teamSize: z.string().max(60).optional(),
});

// Манай өөрийн /profile/freelancer/portfolio/image endpoint нь харьцангуй
// зам буцаадаг (аватартай ижил хэв маяг, avatarSrc() frontend дээр бүтэн
// URL болгодог) — z.url() үүнийг татгалзах тул харьцангуй/бүтэн хоёуланг
// зөвшөөрнө.
const imageUrl = z.string().refine(
  (v) => v.startsWith('/uploads/') || /^https?:\/\//.test(v),
  'images нь зөв URL байх ёстой'
);

export const portfolioItemSchema = z.object({
  title: z.string().min(1, 'Гарчиг шаардлагатай').max(160),
  description: z.string().max(2000).optional(),
  images: z.array(imageUrl).max(10).optional(),
  link: z.url('link буруу байна').optional(),
  // Case study-ийн нэмэлт талбарууд (бүгд заавал биш).
  order: z.coerce.number().int().min(0).max(999).optional(),
  coverIndex: z.coerce.number().int().min(0).max(9).optional(),
  embedUrl: z.url('embed холбоос буруу байна').optional(),
  outcome: z.string().max(300).optional(),
});