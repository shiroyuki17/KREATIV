// Профайл тус бүрийн ХУВААЛЦАХ карт (Open Graph).
//
// Асуудал: SPA нь hash routing (#/u/bat-erdene) ашигладаг бөгөөд hash нь
// HTTP хүсэлтэд ХЭЗЭЭ Ч илгээгддэггүй. Мөн frontend нь Render дээр статик
// сайт тул meta шахах сервер тал байхгүй. Иймд Facebook/Messenger-т
// хуваалцахад бүх линк ижил ерөнхий карт харуулдаг байв.
//
// Шийдэл: crawler-т зориулсан ЖИНХЭНЭ зам (/u/:username) backend дээр
// байрлуулна. Crawler нь JS ажиллуулдаггүй тул meta-г шууд уншина; бодит
// хүн бол SPA руу тэр дор нь дамжина.
//
// Яагаад frontend-ийг backend-ээс үйлчлээгүй вэ: тэр нь илүү цэвэрхэн
// хаяг (нэг домэйн) өгөх боловч Dockerfile-ыг дахин зохион байгуулахыг
// шаардана — тэр файл нь Render-ийн build орчны эвдрэлийг тойрох гар
// аргаар бичигдсэн, dependency-г ГАРААР синк байлгах шаардлагатай гэж
// өөрөө тэмдэглэсэн эмзэг хэсэг. Ажиллаж байгаа deploy-г эрсдэлд оруулах
// нь энэ ажлын үнэ цэнээс хамаагүй өндөр зардалтай.
import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { config } from '../config/env.js';

const router = Router();

/** HTML attribute/text-д хийхээс өмнө escape — нэр/био нь хэрэглэгчийн текст. */
function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function absoluteAvatar(avatarUrl) {
  if (!avatarUrl) return null;
  if (/^https?:\/\//.test(avatarUrl)) return avatarUrl;
  // Манай өөрсдийн upload — backend-ийн үндсэн хаягаар үйлчлэгддэг.
  return `${config.PUBLIC_BACKEND_URL || ''}${avatarUrl}`;
}

// ── GET /u/:username ──
router.get('/u/:username', async (req, res, next) => {
  try {
    const username = String(req.params.username || '').toLowerCase();
    const spaUrl = `${config.FRONTEND_URL}/#/u/${encodeURIComponent(username)}`;

    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        name: true,
        avatarUrl: true,
        freelancerProfile: { select: { headline: true, bio: true, category: true } },
      },
    });

    // Байхгүй хаяг ч гэсэн SPA руу явуулна — тэнд "олдсонгүй" гэж
    // ойлгомжтой харуулна. Энд 404 HTML гаргах нь давхардсан ажил.
    const p = user?.freelancerProfile;
    const name = user?.name || null;
    // Хаяг олдоогүй үед "KREATIV · KREATIV" гэж давхардуулахгүй.
    const title = !name
      ? 'KREATIV — Elite freelance marketplace'
      : p?.headline
      ? `${name} — ${p.headline} · KREATIV`
      : `${name} · KREATIV`;
    const description =
      p?.bio?.slice(0, 200) ||
      (p?.category
        ? `${p.category} мэргэжилтэн KREATIV дээр. Escrow-оор хамгаалсан төлбөр, milestone тутмын баталгаа.`
        : 'KREATIV — escrow-оор хамгаалсан фрилансын зах зээл.');

    // Хүний профайл бол аватарыг нь карт дээр тавих нь илүү танигдахуйц.
    // Аватар нь дөрвөлжин тул summary (жижиг) карт; байхгүй бол брэндийн
    // 1200×630 зураг ба өргөн карт.
    const avatar = absoluteAvatar(user?.avatarUrl);
    const image = avatar || `${config.FRONTEND_URL}/og.png`;
    const cardType = avatar ? 'summary' : 'summary_large_image';

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    // Crawler-ууд кэшлэдэг; профайл өөрчлөгдөхөд хэт удаан хуучирахгүй байх
    // хугацаа.
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.send(`<!doctype html>
<html lang="mn">
<head>
<meta charset="utf-8" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
<link rel="canonical" href="${esc(spaUrl)}" />
<meta property="og:type" content="profile" />
<meta property="og:site_name" content="KREATIV" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:url" content="${esc(spaUrl)}" />
<meta property="og:image" content="${esc(image)}" />
<meta name="twitter:card" content="${cardType}" />
<meta name="twitter:title" content="${esc(title)}" />
<meta name="twitter:description" content="${esc(description)}" />
<meta name="twitter:image" content="${esc(image)}" />
<meta http-equiv="refresh" content="0; url=${esc(spaUrl)}" />
<script>location.replace(${JSON.stringify(spaUrl)});</script>
</head>
<body style="margin:0;background:#17112a;color:#edeef0;font-family:system-ui,sans-serif">
<p style="padding:24px">Профайл руу шилжиж байна… <a style="color:#a374fd" href="${esc(spaUrl)}">${esc(name || 'KREATIV')}</a></p>
</body>
</html>`);
  } catch (err) {
    next(err);
  }
});

export default router;
