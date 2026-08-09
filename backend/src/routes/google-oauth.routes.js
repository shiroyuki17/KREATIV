import { Router } from 'express';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import { config } from '../config/env.js';
import { signAccessToken, signRefreshToken, hashToken } from '../utils/jwt.js';
import { logError } from '../lib/logger.js';

const router = Router();
const STATE_COOKIE = 'oauth_state';
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

function oauthConfigured() {
  return !!(config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET && config.GOOGLE_REDIRECT_URI);
}

async function issueRefreshToken(userId) {
  const token = signRefreshToken({ sub: userId });
  const expiresAt = new Date(Date.now() + config.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({ data: { tokenHash: hashToken(token), userId, expiresAt } });
  return token;
}

// ── GET /auth/google/demo ── (Google Cloud Console key байхгүй үед демо
// зорилгоор ашиглах — тогтмол "demo Google" акаунтаар шууд нэвтэрнэ. Жинхэнэ
// GOOGLE_CLIENT_ID/SECRET орж ирмэгц /google дараа энэ route-ыг дуудахгүй.)
router.get('/google/demo', async (req, res, next) => {
  try {
    // Энэ route баталгаажуулалтгүйгээр хүчинтэй session олгодог тул
    // production-д хэзээ ч байж болохгүй — өмнө нь зөвхөн тайлбар дээр
    // "дуудахгүй" гэж бичсэн байсан ч хэрэгжүүлээгүй, улмаас хэн ч энэ
    // хаягаар нэвтрэх боломжтой байлаа.
    //
    // Dev дээр харин үлдээнэ: жинхэнэ Google урсгал тохиргооны алдаанаас
    // (redirect_uri зөрөх г.м) унасан үед хөгжүүлэгч огт нэвтэрч чадахгүй
    // болохоос сэргийлнэ.
    if (config.NODE_ENV === 'production') {
      return res.status(404).json({ error: 'Not found' });
    }

    const DEMO_EMAIL = 'demo.google@kreativ.mn';
    let user = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: DEMO_EMAIL,
          name: 'Demo Google User',
          googleId: 'demo-google-user',
        },
      });
    }
    if (!user.isActive) {
      return res.redirect(`${config.FRONTEND_URL}/#/auth-callback?oauth_error=account_disabled`);
    }

    const accessToken = signAccessToken({ sub: user.id, role: user.role });
    const refreshToken = await issueRefreshToken(user.id);
    const redirectParams = new URLSearchParams({ accessToken, refreshToken });
    res.redirect(`${config.FRONTEND_URL}/#/auth-callback?${redirectParams.toString()}`);
  } catch (err) {
    // Callback-ийн адил: хөтчийн redirect тул түүхий JSON харуулж болохгүй.
    logError(err, { route: 'auth/google/demo' });
    res.redirect(`${config.FRONTEND_URL}/#/auth-callback?oauth_error=server_error`);
  }
});

// ── GET /auth/google ── (Google-ийн зөвшөөрлийн дэлгэц рүү redirect хийнэ)
router.get('/google', (req, res) => {
  if (!oauthConfigured()) {
    // Демо орчинд жинхэнэ Google key хүлээхийн оронд шууд демо акаунтаар
    // нэвтрүүлнэ — товч нь идэвхгүй болохын оронд ажиллаж харагдана.
    return res.redirect('/auth/google/demo');
  }

  // CSRF хамгаалалт: санамсаргүй state-ийг богино хугацаатай httpOnly cookie-д
  // хадгалж, callback дээр query param-тай тулгана (session store хэрэггүй).
  const state = crypto.randomBytes(16).toString('hex');
  res.cookie(STATE_COOKIE, state, {
    httpOnly: true,
    maxAge: 5 * 60 * 1000,
    sameSite: 'lax',
    secure: config.NODE_ENV === 'production',
  });

  const params = new URLSearchParams({
    client_id: config.GOOGLE_CLIENT_ID,
    redirect_uri: config.GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  });

  res.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
});

// ── GET /auth/google/callback ──
router.get('/google/callback', async (req, res, next) => {
  try {
    if (!oauthConfigured()) {
      return res.status(501).json({ error: 'Google OAuth тохируулагдаагүй байна' });
    }

    const { code, state, error: googleError } = req.query;
    const expectedState = req.cookies?.[STATE_COOKIE];
    res.clearCookie(STATE_COOKIE);

    if (googleError) {
      return res.redirect(`${config.FRONTEND_URL}/#/auth-callback?oauth_error=${encodeURIComponent(googleError)}`);
    }
    if (!code || !state || !expectedState || state !== expectedState) {
      return res.redirect(`${config.FRONTEND_URL}/#/auth-callback?oauth_error=invalid_state`);
    }

    // Authorization code-ийг Google-ийн token endpoint дээр access/id token-оор солино
    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: config.GOOGLE_CLIENT_ID,
        client_secret: config.GOOGLE_CLIENT_SECRET,
        redirect_uri: config.GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const body = await tokenRes.text();
      console.error('Google token exchange failed:', body);
      return res.redirect(`${config.FRONTEND_URL}/#/auth-callback?oauth_error=token_exchange_failed`);
    }

    const { id_token: idToken } = await tokenRes.json();
    // id_token нь Google-ийн token endpoint-ээс сервер хоорондын дуудлагаар шууд
    // ирсэн тул энд зөвхөн decode хийнэ (signature шалгалт нэмэлт давхар аюулгүй
    // байдал өгөх боловч энэ урсгалд заавал биш).
    const profile = jwt.decode(idToken);
    if (!profile?.sub || !profile?.email) {
      return res.redirect(`${config.FRONTEND_URL}/#/auth-callback?oauth_error=invalid_profile`);
    }

    let user = await prisma.user.findUnique({ where: { googleId: profile.sub } });

    if (!user) {
      // Ижил имэйлтэй акаунт аль хэдийн байвал холбоно (жишээ нь эхлээд
      // email/password-оор бүртгүүлж байсан хэрэглэгч дараа нь Google ашиглах).
      //
      // Холбохын өмнө Google имэйлийг баталгаажуулсан эсэхийг шалгана:
      // баталгаажаагүй имэйлээр (Workspace/гадаад домэйнд боломжтой) хэн
      // нэгэн байгаа акаунт руу холбогдож эзэмших эрсдэлээс сэргийлнэ.
      // Шинэ хэрэглэгч үүсгэхэд энэ шалгалт хамаарахгүй — булаах акаунт алга.
      const existing = await prisma.user.findUnique({ where: { email: profile.email } });
      if (existing && profile.email_verified !== true) {
        return res.redirect(`${config.FRONTEND_URL}/#/auth-callback?oauth_error=email_unverified`);
      }
      if (existing) {
        user = await prisma.user.update({
          where: { id: existing.id },
          data: { googleId: profile.sub, avatarUrl: existing.avatarUrl ?? profile.picture },
        });
      } else {
        user = await prisma.user.create({
          data: {
            email: profile.email,
            googleId: profile.sub,
            name: profile.name,
            avatarUrl: profile.picture,
          },
        });
      }
    }

    if (!user.isActive) {
      return res.redirect(`${config.FRONTEND_URL}/#/auth-callback?oauth_error=account_disabled`);
    }

    const accessToken = signAccessToken({ sub: user.id, role: user.role });
    const refreshToken = await issueRefreshToken(user.id);

    const redirectParams = new URLSearchParams({ accessToken, refreshToken });
    res.redirect(`${config.FRONTEND_URL}/#/auth-callback?${redirectParams.toString()}`);
  } catch (err) {
    // Энэ бол ХӨТЧИЙН хаяг руу шууд орж ирсэн redirect, API дуудлага биш.
    // next(err) хийвэл хэрэглэгч backend-ийн URL дээр түүхий
    // {"error":"Серверийн алдаа"} JSON хараад гацдаг — буцах ч зам байхгүй.
    // (Жишээ нь өгөгдлийн сан унтарсан үед яг ингэдэг байв.)
    // Бусад бүх бүтэлгүйтлийн адил frontend рүү буцааж, тэнд ойлгомжтой
    // мессеж харуулна.
    logError(err, { route: 'auth/google/callback' });
    res.redirect(`${config.FRONTEND_URL}/#/auth-callback?oauth_error=server_error`);
  }
});

export default router;
