import { z } from 'zod';
import { FREELANCER_CATEGORIES } from './profile.schema.js';

const imageUrl = z.string().refine(
  (v) => v.startsWith('/uploads/') || /^https?:\/\//.test(v),
  'images нь зөв URL байх ёстой'
);

export const gigCreateSchema = z.object({
  title: z.string().min(5, 'Гарчиг дор хаяж 5 тэмдэгт').max(120),
  description: z.string().min(20, 'Тайлбар дор хаяж 20 тэмдэгт').max(3000),
  category: z.enum(FREELANCER_CATEGORIES),
  price: z.coerce.number().int().positive().max(1_000_000),
  deliveryDays: z.coerce.number().int().positive().max(180),
  images: z.array(imageUrl).max(10).optional(),
});

export const gigUpdateSchema = gigCreateSchema.partial().extend({
  active: z.boolean().optional(),
});

export const gigQuerySchema = z.object({
  q: z.string().max(200).optional(),
  category: z.enum(FREELANCER_CATEGORIES).optional(),
  sort: z.enum(['relevant', 'priceLow', 'priceHigh', 'newest']).default('relevant'),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(50).default(12),
});
