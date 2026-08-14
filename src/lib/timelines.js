// Захиалгын хугацааны сонголтууд.
//
// `value` нь backend-д хадгалагдах канон утга (job.schema.js-ийн TIMELINES-тэй
// ЯГ таарах ёстой), `labelKey` нь зөвхөн харагдах текст. Хоёрыг салгасан
// шалтгаан: хэрэглэгч хэлээ солиход хадгалагдсан утга өөрчлөгдөх ёсгүй.
//
// Энэ жагсаалт PostJob (сонгох) болон ProjectDetail (харуулах) хоёуланд
// хэрэгтэй. PostJob-оос импортлож болох ч тэр нь lazy chunk тул зарын
// дэлгэрэнгүй хуудас нээхэд зар нийтлэх кодыг бүхэлд нь татах байсан.
export const TIMELINES = [
  { value: "lt1w", labelKey: "pj.tl1" },
  { value: "1-2w", labelKey: "pj.tl2" },
  { value: "2-4w", labelKey: "pj.tl3" },
  { value: "1-3m", labelKey: "pj.tl4" },
  { value: "3m+", labelKey: "pj.tl5" },
];

export const TIMELINE_LABEL = Object.fromEntries(
  TIMELINES.map((o) => [o.value, o.labelKey])
);
