import { z } from 'zod';

// Монгол утасны дугаар: 8 орон
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

// FR-1.1 — утасны OTP баталгаажуулалт (демо горим: жинхэнэ SMS gateway
// байхгүй тул код sendMail-ийн адил "илгээгдэж", хариултад буцаана)
export const phoneOtpRequestSchema = z.object({ phone: phoneSchema });
export const phoneOtpVerifySchema = z.object({
  phone: phoneSchema,
  code: z.string().regex(/^\d{6}$/, 'Код 6 орон байх ёстой'),
});