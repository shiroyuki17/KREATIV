// Профайлын хуваалцах боломжтой хаяг (/#/u/<username>) үүсгэх, шалгах.
//
// Кирилл нэрийг латинаар галиглана — "Бат-Эрдэнэ" → "bat-erdene". URL-д
// кирилл тэмдэгт ашиглаж болох ч хуваалцахад percent-encode болж
// уншигдахгүй болдог (жишээ нь %D0%91%D0%B0%D1%82…).
import prisma from './prisma.js';

const CYRILLIC_MAP = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'j', з: 'z',
  и: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', ө: 'u', п: 'p',
  р: 'r', с: 's', т: 't', у: 'u', ү: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch',
  ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

/** Дурын нэрийг URL-д тохирох slug болгоно. Тохирохгүй бол хоосон мөр. */
export function slugify(input) {
  return String(input || '')
    .toLowerCase()
    .split('')
    .map((ch) => (CYRILLIC_MAP[ch] !== undefined ? CYRILLIC_MAP[ch] : ch))
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30);
}

export const USERNAME_RE = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/;

// Маршрут/системийн үгсийг хэрэглэгч эзэмшиж болохгүй — эс тэвэл
// /#/u/settings гэх мэт хаяг төөрөгдөл үүсгэнэ.
const RESERVED = new Set([
  'admin', 'api', 'auth', 'settings', 'profile', 'messages', 'payments',
  'jobs', 'gigs', 'services', 'u', 'me', 'new', 'edit', 'help', 'about',
  'support', 'kreativ', 'null', 'undefined',
]);

export function usernameError(name) {
  if (!USERNAME_RE.test(name)) {
    return 'Хаяг 3-30 тэмдэгт, зөвхөн латин үсэг, тоо, зураас байна';
  }
  if (RESERVED.has(name)) return 'Энэ хаягийг ашиглах боломжгүй';
  return null;
}

/**
 * Давхцахгүй slug гаргана: "bat-erdene", давхцвал "bat-erdene-2" гэх мэт.
 * Нэрнээс юу ч гарахгүй бол (жишээ нь зөвхөн эможи) "user" суурийг барина.
 */
export async function generateUniqueUsername(seed) {
  let base = slugify(seed);
  if (base.length < 3) base = `user-${base}`.slice(0, 30).replace(/-+$/, '');
  if (base.length < 3) base = 'user';

  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`.slice(0, 30);
    if (RESERVED.has(candidate)) continue;
    const taken = await prisma.user.findUnique({ where: { username: candidate }, select: { id: true } });
    if (!taken) return candidate;
  }
  // Онолын хувьд хүрэхгүй — 50 оролдлого бүгд банасан үед санамсаргүй сүүл.
  return `${base}-${Math.random().toString(36).slice(2, 7)}`.slice(0, 30);
}
