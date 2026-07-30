// Day 10 deliverable: "Monitoring". Гадаад APM (Sentry гэх мэт) холбоогүй ч
// сервер өөрөө хэдэн хүсэлт авч, хэд нь алдаатай гарснаа мэддэг байх минимум.
const stats = {
  startedAt: Date.now(),
  totalRequests: 0,
  totalErrors: 0,
  byStatus: { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 },
};

export function metricsMiddleware(req, res, next) {
  res.on('finish', () => {
    stats.totalRequests += 1;
    const bucket = `${Math.floor(res.statusCode / 100)}xx`;
    stats.byStatus[bucket] = (stats.byStatus[bucket] || 0) + 1;
    if (res.statusCode >= 500) stats.totalErrors += 1;
  });
  next();
}

export function metricsHandler(req, res) {
  res.json({
    status: 'ok',
    uptimeSeconds: Math.round((Date.now() - stats.startedAt) / 1000),
    totalRequests: stats.totalRequests,
    totalErrors: stats.totalErrors,
    byStatus: stats.byStatus,
  });
}
