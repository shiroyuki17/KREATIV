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
  // ЯГ ХЭВЭЭР нь дамжуулна — Google-ийн redirect_uri тулгалт нь тэмдэгт
  // тэмдэгтээрээ таарах шаардлагатай. Энд төгсгөлийн "/"-ийг зайлуулж
  // үзсэн боловч Google Cloud Console-д бүртгэсэн хаяг нь "/"-тэй байсан
  // тул харин ч redirect_uri_mismatch өгч эхэлсэн — нормчлол хийхгүй,
  // Console-д бүртгэсэнтэй яг ижлээр Render дээр тохируулах ёстой.
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

  // ── Google Gemini (заавал биш — prompt-оор ажил хайх) ──
  // Түлхүүр: https://aistudio.google.com/api-keys
  // Тохируулаагүй бол /ai/job-search нь энгийн түлхүүр үгийн хайлт руугаа
  // унана — хэрэглэгчид хоосон дэлгэц харагдахгүй.
  GEMINI_API_KEY: z.string().optional(),
  // Тодорхой хувилбар бус ALIAS-ыг өгөгдмөлөөр сонгосон: "gemini-2.5-flash"
  // гэж тогтоосон байсныг Google шинэ хэрэглэгчдэд хаасан бөгөөд
  // generateContent нь 404 "no longer available to new users" буцааж эхэлсэн.
  // Alias нь ийм хуучралтаас хамгаална.
  GEMINI_MODEL: z.string().default('gemini-flash-latest'),
  // Нэг хэрэглэгч өдөрт хэдэн удаа AI хайлт хийж болох вэ. LLM дуудлага
  // бүр мөнгө тул хэрэглэгчийн түвшний хатуу таг — IP-д суурилсан
  // rate limit нь нэг хүн олон IP-аас орох, эсвэл нэг NAT-ын ард олон
  // хүн байх хоёуланг зөв шийддэггүй.
  AI_SEARCH_DAILY_LIMIT: z.coerce.number().int().positive().default(40),

  // ── Stripe (заавал биш) ──
  // Escrow-ийн deposit болон Pro захиалгын аль алинд хэрэглэнэ.
  // Test mode түлхүүр нь `sk_test_...` — жинхэнэ мөнгө хөдлөхгүй.
  STRIPE_SECRET_KEY: z.string().optional(),
  // Webhook signing secret (`whsec_...`). Үүнгүйгээр webhook-ийн гарын үсгийг
  // шалгах боломжгүй тул route нь хүсэлтийг бүрмөсөн ТАТГАЛЗАНА — гарын
  // үсэг шалгаагүй webhook нь хэн ч дурын төлбөрийг "төлөгдсөн" болгож
  // чадна гэсэн үг.
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  // Pro багцын Stripe Price ID-ууд (Dashboard → Product → Pricing).
  STRIPE_PRICE_PRO_MONTHLY: z.string().optional(),
  STRIPE_PRICE_PRO_YEARLY: z.string().optional(),

  // ── Төлбөрийн провайдер сонголт ──
  // 'qpay' | 'stripe' | 'auto'. 'auto' үед тохируулагдсан нь сонгогдоно
  // (Stripe нь QPay-аас түрүүлнэ), аль нь ч байхгүй бол демо горим.
  PAYMENT_PROVIDER: z.enum(['qpay', 'stripe', 'auto']).default('auto'),

  // Демо төлбөрийг ЗӨВХӨН энэ тугтай үед зөвшөөрнө. production дээр
  // тохируулаагүй бол демо горим бүрмөсөн хаагдана (доор app-ийн
  // шалгалтыг үзнэ үү) — эс тэгвээс жинхэнэ сайт дээр хэн ч үнэгүй
  // үлдэгдэл үүсгэж чадна.
  ALLOW_DEMO_PAYMENTS: z.coerce.boolean().default(false),

  // ── Объект хадгалалт (заавал биш — S3_BUCKET + түлхүүр хоёулаа өгөгдсөн
  //    үед л асна, үгүй бол локал диск рүү унана). Дэлгэрэнгүйг
  //    src/lib/storage.js-ээс үзнэ үү. ──
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_REGION: z.string().default('auto'),
  // Cloudflare R2 / MinIO / Backblaze — AWS бус нийлүүлэгчийн эндпойнт.
  S3_ENDPOINT: z.string().optional(),
  // CDN эсвэл public bucket-ийн уншигдах хаяг (заагаагүй бол угсарна).
  S3_PUBLIC_URL: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Орчны хувьсагч (env) буруу байна:');
  console.error(z.treeifyError(parsed.error));
  process.exit(1);
}

export const config = parsed.data;