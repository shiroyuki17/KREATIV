import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { config } from './config/env.js';
import prisma from './lib/prisma.js';
import { openapiSpec } from './docs/openapi.js';
import { metricsMiddleware, metricsHandler } from './middleware/monitoring.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { UPLOAD_ROOT } from './middleware/upload.js';
import authRoutes from './routes/auth.routes.js';
import googleOAuthRoutes from './routes/google-oauth.routes.js';
import profileRoutes from './routes/profile.routes.js';
import jobRoutes from './routes/job.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import messageRoutes from './routes/message.routes.js';
import adminRoutes from './routes/admin.routes.js';

const app = express();
// Railway/Render гэх мэт hosting нь reverse proxy ард ажилладаг тул
// req.ip (rate limiting-ийн key) зөв тодорхойлогдохын тулд шаардлагатай.
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet({
  // API сервер тул HTML CSP шаардлагагүй, disable хийхгүй бол Swagger UI-г эвдэнэ
  contentSecurityPolicy: false,
  // frontend өөр origin/port-оос fetch хийдэг тул JSON хариултыг блоклохгүйн тулд
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({ origin: config.FRONTEND_URL }));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
app.use(morgan(config.NODE_ENV === 'production' ? 'combined' : 'dev'));
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

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Олдсонгүй' });
});

// Алдааны төв handler. err.status/statusCode-ийг хүндэтгэнэ (жишээ:
// body-parser-ийн буруу JSON → 400) — үгүй бол бүх зүйл 500 болж, /metrics-ийн
// 5xx тоолуурыг гуйвуулна (client-ийн алдааг server-ийн алдаа мэт харуулна).
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || err.statusCode || 500;
  const message = status < 500 && err.expose ? err.message : 'Серверийн алдаа';
  res.status(status).json({ error: message });
});

const server = app.listen(config.PORT, () => {
  console.log(`🚀 Kreativ backend: http://localhost:${config.PORT}`);
});

// Graceful shutdown
const shutdown = async () => {
  console.log('\nУнтрааж байна...');
  await prisma.$disconnect();
  server.close(() => process.exit(0));
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);