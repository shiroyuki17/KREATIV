// t() дуудлага бүр зөв холбогдсон эсэхийг шалгана.
//
// Яагаад: build нь `t is not defined`-ыг БАРИХГҮЙ — Vite нь тодорхойлогдоогүй
// хувьсагчийг алдаа гэж үздэггүй, зөвхөн browser дээр тухайн компонент
// рендэрлэгдэх агшинд л ReferenceError болж цагаан дэлгэц үзүүлнэ. Хамгийн
// ховор ордог хуудсанд (жишээ нь нууц үг сэргээх) энэ нь удаан анзаарагдахгүй
// байж болно, тиймээс машинаар шалгуулна.
//
// Мөн толь бичигт БАЙХГҮЙ түлхүүр дуудсаныг илрүүлнэ — t() нь тэр үед
// түлхүүрийг өөрийг нь дэлгэц дээр хэвлэнэ ("nav.foo" гэж харагдана).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { mn } from "./mn.js";
import { en } from "./en.js";

const SRC = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

function jsxFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...jsxFiles(full));
    else if (entry.endsWith(".jsx")) out.push(full);
  }
  return out;
}

// Функц бүрийн биеийг ойролцоогоор олох: дараагийн top-level `function`
// хүртэл. Компонентууд файлын эхний түвшинд зарлагддаг тул хангалттай.
function topLevelFunctions(src) {
  const starts = [...src.matchAll(/^(?:export default )?function (\w+)\s*\(([^)]*)\)/gm)];
  return starts.map((m, i) => ({
    name: m[1],
    // Тусламжийн функцүүд t()-г параметрээр авч болно (hook нь зөвхөн
    // компонент дотор дуудагдана) — тэдгээрийг алдаа гэж үзэхгүй.
    takesT: /(^|[\s,{])t\s*(,|$|\}|=)/.test(m[2]),
    body: src.slice(m.index, i + 1 < starts.length ? starts[i + 1].index : src.length),
  }));
}

const T_CALL = /(?<![\w.])t\(\s*"([^"]+)"/g;
const HAS_HOOK = /use(?:T|I18n)\(\)/;

const problems = [];
const usedKeys = new Set();

for (const file of jsxFiles(SRC)) {
  // i18n.jsx нь давхаргыг өөрийг нь тодорхойлдог — түүний тайлбар дахь
  // t("key") жишээ нь бодит дуудлага биш.
  if (file.endsWith("i18n.jsx")) continue;
  const src = readFileSync(file, "utf8");
  if (!/(?<![\w.])t\(\s*"/.test(src)) continue;
  const rel = file.slice(SRC.length).replace(/\\/g, "/");

  for (const fn of topLevelFunctions(src)) {
    const calls = [...fn.body.matchAll(T_CALL)];
    if (!calls.length) continue;
    for (const c of calls) usedKeys.add(c[1]);
    if (!fn.takesT && !HAS_HOOK.test(fn.body)) {
      problems.push(`${rel}: ${fn.name}() calls t() but never calls useT()`);
    }
    // Жижиг үсгээр эхэлсэн нэр = ердийн функц, компонент биш. Тэнд hook
    // дуудах нь React-ийн дүрэм зөрчинө (нөхцөлт эсвэл давталтад дуудагдаж
    // болно) — build ч, ажиллах үе ч үүнийг үргэлж илчилдэггүй. t()-г
    // параметрээр дамжуулах ёстой.
    if (/^[a-z]/.test(fn.name) && HAS_HOOK.test(fn.body)) {
      problems.push(`${rel}: ${fn.name}() is a plain helper but calls useT() — pass t in as an argument`);
    }
  }
}

const unknown = [...usedKeys].filter((k) => !(k in mn) || !(k in en)).sort();
for (const k of unknown) problems.push(`missing key in dictionaries: "${k}"`);

// Хэрэглэгдэхгүй болсон түлхүүрийг АЛДАА гэж үзэхгүй — зарим нь өөр
// хувьсагчаар (labelKey) дамжин дуудагддаг тул статикаар олдохгүй.

console.log("locale usage");
if (problems.length) {
  for (const p of problems) console.error(`  FAIL ${p}`);
  console.error(`\n${problems.length} problem(s)`);
  process.exit(1);
}
console.log(`  ok  ${usedKeys.size} keys referenced, all resolve, all hooks in scope`);
