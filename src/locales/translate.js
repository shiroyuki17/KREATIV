// React-ийн ГАДНА орчуулах давхарга.
//
// Яагаад i18n.jsx-ээс салгав: `lib/` доторх файлууд (apiClient, paymentsApi,
// useCall) нь бас алдааны мессеж харуулдаг ч hook дуудаж чадахгүй. Тэд
// i18n.jsx-ийг импортолж болохгүй — apiClient.js нь Node дээр ажилладаг
// тесттэй бөгөөд .jsx файлыг Node задлан шинжилж чадахгүй.
//
// Тиймээс толь бичиг + сонголт уншилтыг энд, цэвэр JS-д байрлуулж, i18n.jsx
// нь үүнийг ашиглана.
import { mn } from "./mn.js";
import { en } from "./en.js";

export const DICTS = { mn, en };
export const STORAGE_KEY = "kreativ:locale";

// Өгөгдмөл нь монгол — сайт Монголын фрилансеруудад зориулагдсан. Монгол
// хэрэглэгчийн browser нь ихэвчлэн en-US гэж мэдээлдэг тул navigator.language
// -аас таамаглах нь энд эсрэг үр дүн өгнө.
export const DEFAULT_LOCALE = "mn";

export function isLocale(v) {
  return v === "mn" || v === "en";
}

export function storedLocale() {
  try {
    // ?lang=en нь хадгалсан сонголтыг дардаг: профайлын холбоосыг англи
    // ярьдаг захиалагч руу илгээхэд тэр хүн эхний хормоос эхлэн ойлгомжтой
    // хуудас нээнэ. Hash routing тул query нь # -ээс ӨМНӨ байна
    // (?lang=en#/u/bat-erdene).
    const fromUrl = new URLSearchParams(window.location.search).get("lang");
    if (isLocale(fromUrl)) return fromUrl;

    const v = localStorage.getItem(STORAGE_KEY);
    return isLocale(v) ? v : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

/**
 * Hook-гүйгээр орчуулах — хадгалсан сонголтыг шууд уншина.
 *
 * ErrorBoundary нь I18nProvider-ийн ГАДНА байрладаг (provider өөрөө унасан ч
 * алдааны дэлгэц гарах ёстой) тул context уншиж чадахгүй; lib/ доторх
 * функцүүд ч мөн адил.
 *
 * Орлуулга t()-тэй ижил ажиллана: translate("key", { name: "Бат" }).
 */
export function translate(key, vars) {
  const locale = storedLocale();
  const raw = DICTS[locale]?.[key] ?? mn[key] ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m));
}
