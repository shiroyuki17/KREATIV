import { z } from 'zod';

// Frontend-ийн FindWork.jsx-ийн CATS массивтай тааруулсан
export const CATEGORIES = ['Design', 'Dev', 'AI', 'Motion', 'Writing', 'Marketing'];

const jobFields = {
  title: z.string().min(5, 'Гарчиг дор хаяж 5 тэмдэгт').max(160),
  description: z.string().min(20, 'Тайлбар дор хаяж 20 тэмдэгт').max(5000),
  category: z.enum(CATEGORIES),
  skills: z.array(z.string().min(1)).max(20).optional(),
  languages: z.array(z.string().min(1)).max(10).optional(),
  budgetType: z.enum(['FIXED', 'HOURLY']).optional(),
  budgetMin: z.coerce.number().int().nonnegative().optional(),
  budgetMax: z.coerce.number().int().nonnegative().optional(),
  deadline: z.string().datetime().optional(),
};

const budgetRefine = (d) => d.budgetMin == null || d.budgetMax == null || d.budgetMin <= d.budgetMax;
const budgetRefineOpts = { message: 'budgetMin нь budgetMax-аас их байж болохгүй', path: ['budgetMin'] };

export const jobCreateSchema = z.object(jobFields).refine(budgetRefine, budgetRefineOpts);

// jobFields-д "status" ороогүй тул (шинээр үүсгэхэд үргэлж OPEN-ээс эхэлнэ)
// эзэмшигч client PATCH-аар өөрийн зарыг IN_PROGRESS/CLOSED/CANCELLED болгож
// чадахгүй байсан баг — status-ыг зөвхөн update schema-д нэмж засав.
export const jobUpdateSchema = z
  .object({ ...jobFields, status: z.enum(['OPEN', 'IN_PROGRESS', 'CLOSED', 'CANCELLED']) })
  .partial()
  .refine(budgetRefine, budgetRefineOpts);

export const jobQuerySchema = z.object({
  q: z.string().max(200).optional(),
  category: z.enum(CATEGORIES).optional(),
  type: z.enum(['FIXED', 'HOURLY']).optional(),
  skills: z.string().optional(), // таслалаар тусгаарласан
  // Мөн таслалаар. Өмнө нь энэ шүүлтүүр зөвхөн frontend дээр, ХУУДАСЛАЛТЫН
  // ДАРАА хийгддэг байсан тул тухайн хуудсанд байсан 12 зараас л шүүж,
  // "18 brief" гэж бичээд 3-ыг харуулах, эсвэл бүтэн хуудас хоосон гарах
  // алдаа өгдөг байв.
  languages: z.string().optional(),
  minBudget: z.coerce.number().int().nonnegative().optional(),
  maxBudget: z.coerce.number().int().nonnegative().optional(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'CLOSED', 'CANCELLED']).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(50).default(12),
});
