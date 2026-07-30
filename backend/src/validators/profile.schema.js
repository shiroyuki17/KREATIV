import { z } from 'zod';

export const freelancerProfileSchema = z
  .object({
    headline: z.string().max(120).optional(),
    bio: z.string().max(2000).optional(),
    skills: z.array(z.string().min(1)).max(30).optional(),
    priceMin: z.coerce.number().int().nonnegative().optional(),
    priceMax: z.coerce.number().int().nonnegative().optional(),
  })
  .refine(
    (d) => d.priceMin == null || d.priceMax == null || d.priceMin <= d.priceMax,
    { message: 'priceMin нь priceMax-аас их байж болохгүй', path: ['priceMin'] }
  );

export const clientProfileSchema = z.object({
  orgName: z.string().max(120).optional(),
});

export const portfolioItemSchema = z.object({
  title: z.string().min(1, 'Гарчиг шаардлагатай').max(160),
  description: z.string().max(2000).optional(),
  images: z.array(z.url('images нь URL байх ёстой')).max(10).optional(),
  link: z.url('link буруу байна').optional(),
});