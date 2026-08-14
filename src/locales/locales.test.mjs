// Хоёр толь бичгийн түлхүүр ЯГ ижил эсэхийг шалгана.
//
// Яагаад тест хэрэгтэй вэ: хамгийн олон гардаг алдаа нь mn.js-д түлхүүр
// нэмээд en.js-д мартах — тэгвэл англи хэрэглэгч монгол текст хардаг буюу
// бидний засаж байгаа ЯГ ТЭР хольц дахин үүснэ. Гараар шалгах боломжгүй
// (толь бичиг өснө), тиймээс машинаар шалгуулна.
import assert from "node:assert/strict";
import { mn } from "./mn.js";
import { en } from "./en.js";

let failed = 0;
function check(name, fn) {
  try {
    fn();
    console.log(`  ok  ${name}`);
  } catch (err) {
    failed++;
    console.error(`  FAIL ${name}\n       ${err.message}`);
  }
}

console.log("locales");

check("mn ба en ижил түлхүүртэй", () => {
  const mnKeys = Object.keys(mn).sort();
  const enKeys = Object.keys(en).sort();
  const missingEn = mnKeys.filter((k) => !(k in en));
  const missingMn = enKeys.filter((k) => !(k in mn));
  assert.deepEqual(
    { missingEn, missingMn },
    { missingEn: [], missingMn: [] },
    `en.js-д дутуу: [${missingEn}] | mn.js-д дутуу: [${missingMn}]`
  );
});

check("хоосон утга байхгүй", () => {
  for (const [dictName, dict] of [["mn", mn], ["en", en]]) {
    for (const [k, v] of Object.entries(dict)) {
      assert.equal(typeof v, "string", `${dictName}.${k} нь мөр биш`);
      assert.ok(v.trim().length > 0, `${dictName}.${k} хоосон`);
    }
  }
});

check("орлуулагч {var} хоёр хэлэнд ижил", () => {
  // "{count} unread" ↔ "{count} уншаагүй" — нэг талд нь орлуулагчийг
  // мартвал хэрэглэгч тоогүй өгүүлбэр хардаг.
  const varsOf = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
  for (const k of Object.keys(mn)) {
    assert.deepEqual(varsOf(mn[k]), varsOf(en[k]), `${k}: орлуулагч таарахгүй`);
  }
});

check("англи толь бичигт кирилл үсэг байхгүй", () => {
  // Хуулж буулгах үед хамгийн амархан гардаг алдаа.
  const bad = Object.entries(en).filter(([, v]) => /[А-Яа-яӨөҮү]/.test(v));
  assert.deepEqual(bad, [], `en.js-д кирилл: ${bad.map(([k]) => k)}`);
});

if (failed) {
  console.error(`\n${failed} тест унасан`);
  process.exit(1);
}
console.log(`\n${Object.keys(mn).length} түлхүүр × 2 хэл — бүгд OK`);
