// Огноо/цагийг хэрэглэгчийн СОНГОСОН хэлээр форматлана.
//
// Өмнө нь энэ нь гурван өөр байдлаар хийгддэг байв: зарим газар "en-US"
// гэж хатуу бичсэн, зарим нь [] (browser-ийн хэл), зарим нь огт аргумент
// өгөөгүй. Үр дүнд нь монгол интерфэйс дээр "Aug 14" гэсэн огноо гарч,
// нэг дэлгэц дээр хоёр өөр формат зэрэг харагдах боломжтой байлаа.
//
// Хэлийг Intl-д ӨӨРСДӨӨ дамжуулна: интерфэйсийн хэл бол хэрэглэгчийн
// сонголт, browser-ийн тохиргоо биш.
const TAG = { mn: "mn-MN", en: "en-US" };

/** i18n-ий locale → Intl-ийн хэлний тэмдэглэгээ. */
export function localeTag(locale) {
  return TAG[locale] || TAG.mn;
}

/** "8-р сарын 14" / "Aug 14" — жагсаалт, чатын өдрийн зааг. */
export function shortDate(iso, locale) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(localeTag(locale), { month: "short", day: "numeric" });
}

/** "2026 оны 8-р сарын 14" / "Aug 14, 2026" — төлбөр, захиалгын хугацаа. */
export function longDate(iso, locale) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(localeTag(locale), {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** "2026.08.14" / "8/14/2026" — хүснэгт, метадата. */
export function numericDate(iso, locale) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(localeTag(locale));
}

/** "2026.08.14 17:05" / "8/14/2026, 5:05 PM" — гүйлгээний бүртгэл. */
export function dateTime(iso, locale) {
  if (!iso) return "";
  return new Date(iso).toLocaleString(localeTag(locale));
}

/** "17:05" / "05:05 PM" — зурвасын цаг. */
export function clockTime(iso, locale) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString(localeTag(locale), { hour: "2-digit", minute: "2-digit" });
}
