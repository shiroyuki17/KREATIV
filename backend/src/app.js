// Express app тохиргоо — .listen() дуудахгүй тул Vitest/supertest үүнийг
// шууд import хийж, жинхэнэ порт нээлгүйгээр route-уудыг тестлэж чадна.
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { config } from './config/env.js';
import { openapiSpec } from './docs/openapi.js';
import { metricsMiddleware, metricsHandler } from './middleware/monitoring.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { UPLOAD_ROOT } from './middleware/upload.js';
import { logError } from './lib/logger.js';
import authRoutes from './routes/auth.routes.js';
import googleOAuthRoutes from './routes/google-oauth.routes.js';
import profileRoutes from './routes/profile.routes.js';
import jobRoutes from './routes/job.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import messageRoutes from './routes/message.routes.js';
import adminRoutes from './routes/admin.routes.js';
import contractRoutes from './routes/contract.routes.js';
import disputeRoutes from './routes/dispute.routes.js';
import reviewRoutes from './routes/review.routes.js';
import aiRoutes from './routes/ai.routes.js';
import taskRoutes from './routes/task.routes.js';
import subscriptionRoutes from './routes/subscription.routes.js';
import timeRoutes from './routes/time.routes.js';
import stripeWebhookRoutes from './routes/stripe-webhook.routes.js';

export const app = express();
// Railway/Render гэх мэт hosting нь reverse proxy ард ажилладаг тул
// req.ip (rate limiting-ийн key) зөв тодорхойлогдохын тулд шаардлагатай.
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.set('etag', false);
app.use(helmet({
  // API сервер тул HTML CSP шаардлагагүй, disable хийхгүй бол Swagger UI-г эвдэнэ
  contentSecurityPolicy: false,
  // frontend өөр origin/port-оос fetch хийдэг тул JSON хариултыг блоклохгүйн тулд
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
// Dev орчинд Vite хүссэн portoo (5173/5174/...) авдаг тул FRONTEND_URL нэг
// утгаар түгждэггүй, localhost-ийн ямар ч порт зөвшөөрнө (prod-д яг таг
// нэг domain-аар хязгаарлана — CORS сулраагүй, зөвхөн local dev-ийн эмзэг
// цэгийг шийднэ).
const corsOrigin = config.NODE_ENV === 'production'
  ? config.FRONTEND_URL
  : [config.FRONTEND_URL, /^http:\/\/localhost:\d+$/];
app.use(cors({ origin: corsOrigin }));

// ⚠️ Stripe webhook нь express.json()-оос ӨМНӨ холбогдоно.
// Stripe гарын үсгийг ЯГ ирсэн байт дээр тооцдог тул JSON болгож задалсан
// биет гарын үсгийг эвднэ (route дотроо express.raw() ашиглана). Мөн
// apiLimiter-аас өмнө: Stripe нэг дор олон эвент илгээж болох тул rate
// limit-д хүрч 429 авбал төлбөр алдагдана.
app.use('/webhooks', stripeWebhookRoutes);

app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
if (config.NODE_ENV !== 'test') app.use(morgan(config.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(metricsMiddleware);
app.use(apiLimiter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'kreativ-backend' });
});
app.get('/metrics', metricsHandler);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec, { customSiteTitle: 'Kreativ API Docs' }));
app.get('/openapi.json', (req, res) => res.json(openapiSpec));
app.use('/uploads', express.static(UPLOAD_ROOT));

app.use('/auth', authRoutes);
app.use('/auth', googleOAuthRoutes);
app.use('/profile', profileRoutes);
app.use('/jobs', jobRoutes);
app.use('/analytics', analyticsRoutes);
app.use('/payments', paymentRoutes);
app.use('/notifications', notificationRoutes);
app.use('/messages', messageRoutes);
app.use('/admin', adminRoutes);
app.use('/', contractRoutes);
app.use('/disputes', disputeRoutes);
app.use('/', reviewRoutes);
// Лимитерүүд route тус бүрд ai.routes.js дотор өгөгдөнө — чат болон
// хайлт өөр өөр давтамжтай тул нэг blanket лимит хоёуланд нь тохирохгүй.
app.use('/ai', aiRoutes);
app.use('/', taskRoutes);
app.use('/', subscriptionRoutes);
app.use('/', timeRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Олдсонгүй' });
});

// Алдааны төв handler. err.status/statusCode-ийг хүндэтгэнэ (жишээ:
// body-parser-ийн буруу JSON → 400) — үгүй бол бүх зүйл 500 болж, /metrics-ийн
// 5xx тоолуурыг гуйвуулна (client-ийн алдааг server-ийн алдаа мэт харуулна).
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  logError(err, { method: req.method, path: req.path, status });
  const message = status < 500 && err.expose ? err.message : 'Серверийн алдаа';
  res.status(status).json({ error: message });
});
