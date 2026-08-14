// Хэлний давхарга — хэрэглэгч өөрөө монгол/англи сонгоно.
//
// Гуравдагч сан (react-i18next г.м) татаагүй: бидэнд хэрэгтэй нь ердөө
// түлхүүр→текст хайлт, хэдэн орлуулга, сонголтыг хадгалах гурав. Тэдгээрийн
// төлөө bundle-д 40KB+ нэмэх, шинэ API сурах шаардлагагүй.
//
// Зарчим: түлхүүр нэмэх бол ХОЁР хэл дээр НЭГ ЗЭРЭГ нэмнэ. Тал дутуу
// орчуулга нь одоо байгаа хольцыг өөр хэлбэрээр давтахаас өөр зүйл болохгүй.
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { mn } from "./locales/mn.js";
import { en } from "./locales/en.js";

const DICTS = { mn, en };
const STORAGE_KEY = "kreativ:locale";

// Өгөгдмөл нь монгол — сайт Монголын фрилансеруудад зориулагдсан. Монгол
// хэрэглэгчийн browser нь ихэвчлэн en-US гэж мэдээлдэг тул navigator.language
// -аас таамаглах нь энд эсрэг үр дүн өгнө.
const DEFAULT_LOCALE = "mn";

function storedLocale() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "mn" || v === "en" ? v : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

const I18nCtx = createContext(null);

export function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState(storedLocale);

  const setLocale = useCallback((next) => {
    if (next !== "mn" && next !== "en") return;
    setLocaleState(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* private mode */ }
    // <html lang> нь screen reader-ийн дуудлага, browser-ийн орчуулгын
    // саналд нөлөөлдөг тул хамт шинэчилнэ.
    document.documentElement.setAttribute("lang", next);
  }, []);

  /**
   * t("key") эсвэл t("key", { name: "Бат" }) — {name} хэлбэрийн орлуулга.
   *
   * Түлхүүр байхгүй бол нөгөө хэлнээс, тэр ч байхгүй бол ТҮЛХҮҮРИЙГ ӨӨРИЙГ
   * буцаана. Хоосон мөр буцаавал UI дээр текст чимээгүй алга болж, дутуу
   * орчуулгыг хэн ч анзаарахгүй — түлхүүр харагдвал тэр дор нь илэрнэ.
   */
  const t = useCallback(
    (key, vars) => {
      const raw = DICTS[locale]?.[key] ?? DICTS[locale === "mn" ? "en" : "mn"]?.[key] ?? key;
      if (!vars) return raw;
      return raw.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m));
    },
    [locale]
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nCtx);
  // Provider-гүй рендэрлэгдсэн (тест, storybook) үед ч унахгүй байх.
  if (!ctx) return { locale: DEFAULT_LOCALE, setLocale: () => {}, t: (k) => mn[k] ?? k };
  return ctx;
}

/** Зөвхөн t() хэрэгтэй байнга — тусад нь болгосон нь дуудлагыг богиносгоно. */
export function useT() {
  return useI18n().t;
}
