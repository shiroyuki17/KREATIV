import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { config } from '../config/env.js';

// Access token — богино хугацаатай, route хамгаалахад ашиглана
export function signAccessToken(payload) {
  return jwt.sign(payload, config.JWT_ACCESS_SECRET, {
    expiresIn: config.ACCESS_TOKEN_TTL,
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, config.JWT_ACCESS_SECRET);
}

// Refresh token — урт хугацаатай, шинэ access token авахад ашиглана.
// jti (random nonce) заавал хэрэгтэй: sub/iat/exp дангаараа ижил секундэд
// хоёр удаа token гаргавал (ж: login дараа нь шууд refresh) байт-байтаараа
// ижил JWT үүсэж, tokenHash unique constraint мөргөлддөг байсан (P2002).
export function signRefreshToken(payload) {
  return jwt.sign({ ...payload, jti: crypto.randomBytes(16).toString('hex') }, config.JWT_REFRESH_SECRET, {
    expiresIn: `${config.REFRESH_TOKEN_TTL_DAYS}d`,
  });
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, config.JWT_REFRESH_SECRET);
}

// Refresh token-ийг DB-д hash хэлбэрээр хадгална (анхны утгыг биш)
export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}