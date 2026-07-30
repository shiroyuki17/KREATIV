import { z } from 'zod';

// Монгол утасны дугаар: 8 орон (OTP баталгаажуулалт хойшлогдсон —
// PRD FR-1.1, дараагийн шатанд нэмэгдэнэ)
const phoneSchema = z.string().regex(/^\d{8}$/, 'Утасны дугаар 8 орон байх ёстой');

export const registerSchema = z.object({
  email: z.email('Имэйл буруу байна'),
  password: z.string().min(8, 'Нууц үг дор хаяж 8 тэмдэгт'),
  name: z.string().min(1).optional(),
  phone: phoneSchema.optional(),
});

export const loginSchema = z.object({
  email: z.email('Имэйл буруу байна'),
  password: z.string().min(1, 'Нууц үг шаардлагатай'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'refreshToken шаардлагатай'),
});