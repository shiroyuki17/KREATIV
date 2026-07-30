import rateLimit from 'express-rate-limit';

// Brute-force/credential-stuffing хамгаалалт — register/login/refresh дээр.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Хэт олон оролдлого хийлээ. 15 минутын дараа дахин оролдоно уу.' },
});

// Ерөнхий баазын хамгаалалт — бүх route дээр суурь DoS/scraping хязгаар.
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Хэт олон хүсэлт. Түр хүлээгээд дахин оролдоно уу.' },
});
