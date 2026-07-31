import { z } from 'zod';

export const proposalCreateSchema = z.object({
  price: z.coerce.number().int().positive(),
  durationDays: z.coerce.number().int().positive().optional(),
  coverLetter: z.string().min(10, 'Cover letter дор хаяж 10 тэмдэгт').max(3000),
});

export const acceptProposalSchema = z.object({
  milestones: z
    .array(
      z.object({
        title: z.string().min(1).max(160),
        amount: z.coerce.number().int().positive(),
      })
    )
    .min(1)
    .max(20)
    .optional(),
});

export const deliverMilestoneSchema = z.object({
  note: z.string().max(3000).optional(),
  link: z.url('link буруу байна').optional(),
});

export const disputeCreateSchema = z.object({
  milestoneId: z.uuid(),
  reason: z.string().min(10, 'Шалтгаан дор хаяж 10 тэмдэгт').max(3000),
});

export const disputeResolveSchema = z.object({
  resolution: z.enum(['FREELANCER', 'CLIENT', 'SPLIT']),
});

export const reviewCreateSchema = z.object({
  stars: z.coerce.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
});
