// Хэл солигч — Монгол ⇄ English.
//
// Яагаад dropdown биш вэ: сонголт нь ердөө хоёр. Dropdown нь нэг дарахын
// оронд хоёр дарахыг шаардаж, аль нь одоо сонгогдсоныг нуудаг. Segmented
// control нь аль нь одоо ажиллаж байгааг байнга харуулна.
import { Languages } from "lucide-react";
import { useI18n } from "../../i18n.jsx";

const OPTIONS = [
  // Хэлний нэрийг ТУХАЙН ХЭЛЭЭР бичнэ — өөр хэл рүү санамсаргүй сольсон
  // хүн эргэж өөрийнхийгөө олохын тулд. "Mongolian" гэж англиар бичвэл
  // англи мэдэхгүй хүн буцаж чадахгүй.
  { key: "mn", label: "Монгол", short: "МН" },
  { key: "en", label: "English", short: "EN" },
];

/** Menu-д зориулсан бүтэн мөр (икон + шошго + сонголт). */
export default function LocalePicker() {
  const { locale, setLocale, t } = useI18n();

  return (
    <div className="flex items-center gap-2.5 px-4 py-3">
      <Languages className="h-4 w-4 shrink-0 text-white/40" />
      <span className="flex-1 text-[13px] text-white/80">{t("common.language")}</span>
      <div
        role="radiogroup"
        aria-label={t("common.language")}
        className="flex gap-0.5 rounded-lg border border-white/10 bg-white/[0.03] p-0.5"
      >
        {OPTIONS.map(({ key, label, short }) => (
          <button
            key={key}
            role="radio"
            aria-checked={locale === key}
            aria-label={label}
            onClick={() => setLocale(key)}
            className={`rounded-md px-2 py-1 text-[10.5px] font-bold transition-colors ${
              locale === key ? "bg-brand text-ink" : "text-white/50 hover:text-white"
            }`}
          >
            {short}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Navbar-д зориулсан нягт хувилбар — зөвхөн одоогийн хэлийг эсрэгээр солино. */
export function LocaleToggle({ className = "" }) {
  const { locale, setLocale } = useI18n();
  const other = OPTIONS.find((o) => o.key !== locale);

  return (
    <button
      onClick={() => setLocale(other.key)}
      // Дарвал ЮУ БОЛОХЫГ хэлнэ ("Монгол" гэдэг нь одоогийн эсэх нь
      // тодорхойгүй байх байсан).
      aria-label={`${other.label}`}
      title={other.label}
      className={
        className ||
        "inline-flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-[12px] font-bold text-white/55 transition-colors hover:bg-white/5 hover:text-white"
      }
    >
      <Languages className="h-4 w-4" />
      {other.short}
    </button>
  );
}
