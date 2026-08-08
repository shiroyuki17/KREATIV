// Сайтын бүх JS-ээр удирдагдах хөдөлгөөний ганц эх сурвалж (anime.js v4).
//
// Яагаад wrapper хэрэгтэй вэ:
//  1. index.css-ийн prefers-reduced-motion дүрэм зөвхөн CSS animation/transition-ыг
//     зогсоодог — JS-ээр хөдөлж буй зүйл түүнийг тоодоггүй. Энд бүх хөдөлгөөн
//     нэг хаалгаар ордог тул тохиргоог хүндэтгэх нь мартагдах боломжгүй.
//  2. Duration/easing-ийг нэг газар төвлөрүүлснээр 40 файл тус тусдаа өөрийн
//     муруй зохиохоос сэргийлнэ.
import { useLayoutEffect, useRef } from "react";
import { animate, createScope, createTimeline, cubicBezier, onScroll, stagger, utils } from "animejs";

// ── Токенууд ──
// EASE.out нь index.css даяар давтагддаг сайтын "гарын үсэг" муруй — CSS болон
// JS хөдөлгөөн нэг мэдрэмжтэй байхын тулд яг ижил утгыг ашиглана.
//
// anime.js v4 нь `ease: "cubicBezier(...)"` гэсэн МӨРӨН синтаксыг устгасан —
// өмнө нь мөрөөр дамжуулсан тул сайт даяар бүх JS хөдөлгөөн энэ муруйг
// чимээгүй үл тоомсорлож, өгөгдмөл easing-ээр ажиллаж байлаа (browser
// консолд "String syntax ... has been removed" анхааруулга давтагдаж
// байсан). Одоо cubicBezier()-ийг шууд дуудаж easing функц үүсгэнэ.
export const EASE = {
  out: cubicBezier(0.22, 1, 0.36, 1),
  inOut: cubicBezier(0.4, 0, 0.2, 1),
  pop: cubicBezier(0.34, 1.56, 0.64, 1),
};

export const DUR = {
  fast: 200,
  base: 450,
  slow: 700,
  ambient: 1200,
};

export { stagger, utils };

// ── Reduced-motion ──
const mq =
  typeof window !== "undefined" && window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : null;

export const prefersReduced = () => !!mq?.matches;

// animate()-ийн тохиргооны түлхүүр биш, харин анимац хийгдэх шинж чанаруудыг
// ялгаж авахад хэрэглэнэ.
const CONTROL_KEYS = new Set([
  "duration", "delay", "ease", "loop", "loopDelay", "alternate", "reversed",
  "autoplay", "composition", "modifier", "playbackEase", "playbackRate",
  "frameRate", "onBegin", "onComplete", "onUpdate", "onLoop", "onPause",
  "onBeforeUpdate", "onRender", "id",
]);

// Хөдөлгөөнийг унтраасан үед "төгсгөлийн байдал"-ыг шууд тавихын тулд
// [from, to] массив эсвэл { from, to } объектоос эцсийн утгыг гаргаж авна.
function finalValues(params) {
  const out = {};
  for (const [key, value] of Object.entries(params)) {
    if (CONTROL_KEYS.has(key)) continue;
    if (Array.isArray(value)) out[key] = value[value.length - 1];
    else if (value && typeof value === "object" && "to" in value) out[key] = value.to;
    else out[key] = value;
  }
  return out;
}

// Эсрэгээрээ — эхлэлийн утгууд.
//
// Яагаад хэрэгтэй вэ: scroll-оор асдаг анимац нь элемент харагдах хүртэл
// эхлэхгүй, харин anime нь эхлэлийн утгыг зөвхөн ЭХЭЛЖ байж тавьдаг. Тиймээс
// хооронд нь контент бүтэн харагдаад дараа нь нуугдаж "анивчих" болно.
// Үүнийг JSX дотор style={{opacity:0}} гэж бичээд шийдэж болох ч тэгвэл JS
// ямар нэг шалтгаанаар ажиллахгүй үед контент бүрмөсөн үл үзэгдэх болно.
// Иймд нуултыг useLayoutEffect дотроос (зурагдахаас өмнө) хийнэ — JS байхгүй
// бол хуудас зүгээр л хөдөлгөөнгүй, гэхдээ БҮРЭН харагдана.
function startValues(params) {
  const out = {};
  for (const [key, value] of Object.entries(params)) {
    if (CONTROL_KEYS.has(key)) continue;
    if (Array.isArray(value)) out[key] = value[0];
    else if (value && typeof value === "object" && "from" in value) out[key] = value.from;
  }
  return out;
}

/**
 * animate()-ийн оронд ашиглах ерөнхий орц. Хөдөлгөөн унтраалттай үед юу ч
 * хөдөлгөхгүй, гэхдээ элемент харагдах эцсийн байдалдаа шууд очно — ингэснээр
 * "opacity: 0"-оор гацсан үл үзэгдэх контент үлдэхгүй.
 */
export function motion(targets, params = {}) {
  if (prefersReduced()) {
    utils.set(targets, finalValues(params));
    params.onComplete?.();
    return null;
  }
  return animate(targets, { ease: EASE.out, duration: DUR.base, ...params });
}

// Хөдөлгөөн унтраалттай үеийн timeline-ийн орлуулга — ижил гинжин API-тай
// боловч бүх алхмыг шууд эцсийн байдалд нь тавина.
function reducedTimeline() {
  const stub = {
    add(targets, params = {}) {
      utils.set(targets, finalValues(params));
      return stub;
    },
    set(targets, params = {}) {
      utils.set(targets, finalValues(params));
      return stub;
    },
    label: () => stub,
    sync: () => stub,
    call(fn) {
      fn?.();
      return stub;
    },
    play: () => stub,
    pause: () => stub,
    restart: () => stub,
    revert: () => stub,
  };
  return stub;
}

/** createTimeline()-ийн оронд — sequenced entrance/choreography-д. */
export function timeline(params = {}) {
  if (prefersReduced()) return reducedTimeline();

  const tl = createTimeline({
    defaults: { ease: EASE.out, duration: DUR.base },
    ...params,
  });

  // Timeline-ийн эхний tick нь дараагийн кадрт болдог тул түүнийг хүлээвэл
  // элементүүд нэг кадр бүтэн харагдаад дараа нь нуугдана. Алхам нэмэх бүрд
  // эхлэлийн байдлыг нь шууд тавьж энэ анивчихыг арилгана.
  const add = tl.add.bind(tl);
  tl.add = (targets, tweenParams, position) => {
    if (targets && (typeof targets === "string" || targets instanceof Element || Array.isArray(targets))) {
      utils.set(targets, startValues(tweenParams || {}));
    }
    add(targets, tweenParams, position);
    return tl;
  };

  return tl;
}

/**
 * Scroll-д орж ирэхэд нэг удаа тоглох хөдөлгөөн. Өмнө нь component бүр өөрийн
 * IntersectionObserver үүсгэдэг байсныг anime-ийн onScroll орлоно.
 */
export function reveal(targets, params = {}) {
  const { enter = "bottom-=80 top", scrollTarget, ...rest } = params;
  if (prefersReduced()) {
    // Энгийн объект (тоо tween хийх г.м) бол утгыг нь тавиад onUpdate-ыг
    // нэг удаа дуудаж эцсийн үр дүнг DOM-д бичүүлнэ.
    const plain = !(targets instanceof Element) && typeof targets === "object" && !Array.isArray(targets);
    if (plain) Object.assign(targets, finalValues(rest));
    else utils.set(targets, finalValues(rest));
    rest.onUpdate?.();
    rest.onComplete?.();
    return null;
  }
  // Scroll хүлээж байх хугацаанд контент "гараад дараа нь нуугдахаас"
  // сэргийлж эхлэлийн байдлыг нь одоо тавина.
  if (targets instanceof Element || typeof targets === "string" || Array.isArray(targets)) {
    utils.set(targets, startValues(rest));
  }

  return animate(targets, {
    ease: EASE.out,
    duration: DUR.slow,
    ...rest,
    // scrollTarget нь DOM биш зүйлийг (жишээ нь тоон tween-ий объект) scroll-оор
    // асаахад хэрэгтэй — observer-т ажиглах бодит элемент зааж өгнө.
    autoplay: onScroll({ enter, once: true, ...(scrollTarget ? { target: scrollTarget } : null) }),
  });
}

/**
 * Тоон утгыг scroll-д орж ирэхэд tween хийнэ (тоолуур).
 *
 * Яагаад reveal()-ийг шууд ашиглахгүй вэ: anime-ийн onScroll() нь бай нь
 * ЭНГИЙН ОБЪЕКТ (DOM элемент биш) үед `target:` заасан ч найдвартай
 * асдаггүй. Үүнээс болж нүүр хуудасны бүх тоолуур ("VETTED FREELANCERS",
 * "PAID OUT SECURELY" г.м) дэлгэц дээр бүтэн харагдаж байхад 0 дээрээ
 * үүрд гацдаг байв. Триггерийг IntersectionObserver-т даалгаж, tween-ийг
 * ердийн motion()-оор явуулснаар энэ найдваргүй байдлыг тойрч гарна.
 *
 * @returns {() => void} цэвэрлэх функц
 */
export function revealValue(el, { from = 0, to, onUpdate, ...rest } = {}) {
  const state = { value: from };
  const emit = () => onUpdate?.(state.value);

  if (prefersReduced()) {
    state.value = to;
    emit();
    return () => {};
  }

  // ЭХЛЭЭД эцсийн утгыг бичнэ, 0-ийг биш.
  //
  // Тоолуурын хувьд "хөдөлгөөн ажиллаагүй" гэдэг нь зүгээр л хөдөлгөөнгүй
  // гэсэн үг биш — БУРУУ ТОО харагдана гэсэн үг. Хэрэв IntersectionObserver
  // ажиллахгүй (арын таб, элемент хэзээ ч харагдахгүй, JS хэсэгчлэн
  // унасан) бол хэрэглэгч "0 vetted freelancers" гэж уншина. Тиймээс
  // өгөгдмөл байдал нь ҮРГЭЛЖ зөв тоо байх ёстой; tween эхлэх яг тэр
  // мөчид л 0 руу буцаана.
  state.value = to;
  emit();

  let anim = null;
  const io = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      state.value = from;
      anim = motion(state, { duration: DUR.slow, ...rest, value: to, onUpdate: emit });
    },
    // reveal()-ийн "bottom-=80"-той ижил санаа: элемент доод захаас 80px
    // дотогш орж ирсэн үед л асна.
    { rootMargin: "0px 0px -80px 0px" }
  );
  io.observe(el);

  return () => {
    io.disconnect();
    anim?.revert?.();
  };
}

/** Ганц элементийг scroll-д орж ирэхэд илчлэх — хамгийн түгээмэл тохиолдол. */
export function useReveal(params = {}, deps = []) {
  const ref = useRef(null);
  const paramsRef = useRef(params);
  paramsRef.current = params;

  useLayoutEffect(() => {
    if (!ref.current) return undefined;
    const anim = reveal(ref.current, paramsRef.current);
    return () => anim?.revert?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return ref;
}

/**
 * Component-д хамаарах хөдөлгөөнийг scope дотор үүсгэнэ. Scope нь unmount
 * хийхэд өөрөө бүх анимацаа буцаадаг тул гараар цэвэрлэх шаардлагагүй.
 *
 *   const ref = useMotion(() => { motion(".card", { opacity: [0, 1] }); });
 *   return <div ref={ref}>…</div>;
 */
export function useMotion(setup, deps = []) {
  const root = useRef(null);
  const setupRef = useRef(setup);
  setupRef.current = setup;

  useLayoutEffect(() => {
    if (!root.current) return undefined;
    const scope = createScope({ root }).add((self) => setupRef.current(self));
    return () => scope.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return root;
}
