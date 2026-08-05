import 'dotenv/config';
import { z } from 'zod';

// Эхлэхэд л env-ийг шалгана — буруу бол тэр даруй унаж, тодорхой алдаа өгнө
const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL шаардлагатай'),
  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET дор хаяж 16 тэмдэгт'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET дор хаяж 16 тэмдэгт'),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().default(7),
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // ── Google OAuth (заавал биш — тохируулаагүй бол demo акаунтаар нэвтэрнэ) ──
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().optional(),
  FRONTEND_URL: z.string().default('http://localhost:5174'),

  // ── SMTP (заавал биш — тохируулаагүй бол Ethereal демо inbox ашиглана) ──
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_SECURE: z.coerce.boolean().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),

  // ── QPay (заавал биш — тохируулаагүй бол демо invoice/confirm ашиглана) ──
  QPAY_BASE_URL: z.string().optional(),
  QPAY_USERNAME: z.string().optional(),
  QPAY_PASSWORD: z.string().optional(),
  QPAY_INVOICE_CODE: z.string().optional(),
  QPAY_CALLBACK_URL: z.string().optional(),

  // ── AI chat (заавал биш — тохируулаагүй бол frontend rule-based хариултаа ашиглана) ──
  ANTHROPIC_API_KEY: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Орчны хувьсагч (env) буруу байна:');
  console.error(z.treeifyError(parsed.error));
  process.exit(1);
}

export const config = parsed.data;