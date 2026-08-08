// apiClient.js-ийн refresh урсгалыг DB-гүйгээр шалгах — fetch-ийг stub хийж,
// backend-ийн бодит зан төлөвийг (401, rotation, 5xx, сүлжээ тасрах) дуурайна.
import assert from "node:assert/strict";

// ── localStorage + window shim ──
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};
const listeners = new Map();
globalThis.CustomEvent = class { constructor(type, init) { this.type = type; this.detail = init?.detail; } };
globalThis.window = {
  addEventListener: (t, fn) => listeners.set(t, [...(listeners.get(t) || []), fn]),
  removeEventListener: () => {},
  dispatchEvent: (e) => { (listeners.get(e.type) || []).forEach((fn) => fn(e)); return true; },
};

// Web Locks нь Node-д байхгүй. Табуудыг цуваалдаг зан төлөвийг шалгахын
// тулд хамгийн энгийн жинхэнэ mutex-ээр орлуулна.
let lockChain = Promise.resolve();
// Node 24-д `navigator` нь getter-only тул шууд оноож болохгүй.
Object.defineProperty(globalThis, "navigator", {
  configurable: true,
  value: {
    locks: {
      request(_name, fn) {
        const run = lockChain.then(() => fn());
        lockChain = run.catch(() => {});
        return run;
      },
    },
  },
});

const api = await import("./apiClient.js");

const ACCESS = "kreativ:accessToken";
const REFRESH = "kreativ:refreshToken";
let calls = [];
let refreshCount = 0;

function reset() {
  store.clear();
  calls = [];
  refreshCount = 0;
}

function json(status, body) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

// ── Тест 1: 401 ирвэл refresh хийж, хүсэлтийг давтана ──
reset();
store.set(ACCESS, "expired-access");
store.set(REFRESH, "good-refresh");
globalThis.fetch = async (url, opts) => {
  calls.push(`${opts?.method || "GET"} ${url}`);
  if (url.endsWith("/auth/refresh")) {
    refreshCount++;
    return json(200, { accessToken: "new-access", refreshToken: "new-refresh" });
  }
  const auth = opts?.headers?.Authorization;
  if (auth === "Bearer expired-access") return json(401, { error: "Token хүчингүй" });
  if (auth === "Bearer new-access") return json(200, { id: "u1", name: "Daniel" });
  return json(401, { error: "no auth" });
};
let me = await api.apiJson("/auth/me");
assert.equal(me.name, "Daniel", "401 дараа refresh хийгээд хүсэлт давтагдах ёстой");
assert.equal(refreshCount, 1);
assert.equal(store.get(ACCESS), "new-access", "шинэ access token хадгалагдана");
assert.equal(store.get(REFRESH), "new-refresh", "rotation-ийн шинэ refresh token хадгалагдана");
console.log("✅ 1. 401 → refresh → retry ажиллаж байна");

// ── Тест 2: зэрэг явсан 5 хүсэлт ГАНЦ л refresh дуудна (rotation хамгаалалт) ──
reset();
store.set(ACCESS, "expired-access");
store.set(REFRESH, "good-refresh");
globalThis.fetch = async (url, opts) => {
  if (url.endsWith("/auth/refresh")) {
    refreshCount++;
    await new Promise((r) => setTimeout(r, 20));
    return json(200, { accessToken: "new-access", refreshToken: "new-refresh" });
  }
  const auth = opts?.headers?.Authorization;
  if (auth === "Bearer new-access") return json(200, { ok: true });
  return json(401, { error: "Token хүчингүй" });
};
const results = await Promise.all([
  api.apiJson("/payments/balance"),
  api.apiJson("/notifications"),
  api.apiJson("/messages/conversations"),
  api.apiJson("/contracts/mine"),
  api.apiJson("/jobs/mine"),
]);
assert.ok(results.every((r) => r.ok), "бүх хүсэлт амжилттай дуусах ёстой");
assert.equal(refreshCount, 1, `single-flight эвдэрсэн: refresh ${refreshCount} удаа дуудагдлаа`);
console.log("✅ 2. Зэрэг 5 хүсэлт → refresh ганц удаа (single-flight)");

// ── Тест 3: refresh 401 буцаавал session дуусна + AUTH_EXPIRED эвент ──
reset();
store.set(ACCESS, "expired-access");
store.set(REFRESH, "revoked-refresh");
let expiredFired = false;
listeners.set(api.AUTH_EXPIRED_EVENT, [() => { expiredFired = true; }]);
globalThis.fetch = async (url) => {
  if (url.endsWith("/auth/refresh")) return json(401, { error: "Refresh token хүчингүй" });
  return json(401, { error: "Token хүчингүй" });
};
await assert.rejects(() => api.apiJson("/auth/me"), (e) => e.status === 401);
assert.equal(store.get(ACCESS), undefined, "хүчингүй session дээр token цэвэрлэгдэнэ");
assert.ok(expiredFired, "AUTH_EXPIRED эвент илгээгдэх ёстой");
console.log("✅ 3. Refresh хүчингүй → гарах + эвент");

// ── Тест 4: сүлжээ тасрахад token-ыг УСТГАХГҮЙ (энэ л reload дээр гаргадаг байсан) ──
reset();
store.set(ACCESS, "expired-access");
store.set(REFRESH, "good-refresh");
globalThis.fetch = async (url) => {
  if (url.endsWith("/auth/refresh")) throw new TypeError("Failed to fetch");
  return json(401, { error: "Token хүчингүй" });
};
await assert.rejects(() => api.apiJson("/auth/me"));
assert.equal(store.get(REFRESH), "good-refresh", "сүлжээний алдаанд refresh token хэвээр байх ёстой");
console.log("✅ 4. Сүлжээ тасрахад token устахгүй");

// ── Тест 5: 5xx дээр ч гэсэн token хэвээр ──
reset();
store.set(ACCESS, "expired-access");
store.set(REFRESH, "good-refresh");
globalThis.fetch = async (url) => {
  if (url.endsWith("/auth/refresh")) return json(503, { error: "down" });
  return json(401, { error: "Token хүчингүй" });
};
await assert.rejects(() => api.apiJson("/auth/me"));
assert.equal(store.get(REFRESH), "good-refresh", "сервер унасан үед token хэвээр байх ёстой");
console.log("✅ 5. Сервер 5xx үед token устахгүй");

// ── Тест 6: hasSession нь access дууссан ч refresh байвал үнэн ──
reset();
store.set(REFRESH, "good-refresh");
assert.equal(api.hasSession(), true, "зөвхөн refresh token байхад ч session хүчинтэй");
reset();
assert.equal(api.hasSession(), false);
console.log("✅ 6. hasSession() зөв ажиллаж байна");

// ── Тест 7: ХОЁР ТАБ зэрэг refresh хийхэд токен ганц л удаа rotate болно ──
//
// Backend нь rotate хийгдсэн refresh token дахин ирвэл "хулгайлагдсан" гэж
// үзээд хэрэглэгчийн БҮХ session-ийг устгадаг. Модуль доторх single-flight
// нь зөвхөн НЭГ таб дотор хамгаалдаг тул хоёр таб зэрэг оролдоход хэрэглэгч
// бүх табаас санамсаргүй гардаг байв. Web Locks табуудыг цуваална.
reset();
store.set(ACCESS, "expired-access");
store.set(REFRESH, "good-refresh");
const refreshCalls = [];
globalThis.fetch = async (url, opts) => {
  if (url.endsWith("/auth/refresh")) {
    const sent = JSON.parse(opts.body).refreshToken;
    refreshCalls.push(sent);
    // Хуучирсан токен ирвэл backend-ийн адил бүх session-ийг устгана.
    if (sent !== store.get(REFRESH)) {
      store.delete(ACCESS);
      store.delete(REFRESH);
      return json(401, { error: "бүх төхөөрөмжөөс гарлаа" });
    }
    await new Promise((r) => setTimeout(r, 15));
    const n = refreshCalls.length;
    return json(200, { accessToken: `access-${n}`, refreshToken: `refresh-${n}` });
  }
  return json(401, { error: "Token хүчингүй" });
};

// Тусдаа instance = тусдаа таб (тус бүр өөрийн refreshPromise-тэй)
const stamp = Date.now();
const tabA = await import(`./apiClient.js?tabA=${stamp}`);
const tabB = await import(`./apiClient.js?tabB=${stamp}`);
const [accA, accB] = await Promise.all([tabA.refreshAccessToken(), tabB.refreshAccessToken()]);

assert.ok(accA, "таб A access token авах ёстой");
assert.ok(accB, "таб B access token авах ёстой");
assert.equal(
  refreshCalls.length,
  1,
  `refresh ганц л удаа явах ёстой, ${refreshCalls.length} удаа явлаа`
);
assert.ok(store.get(REFRESH), "session амьд үлдэх ёстой");
console.log("✅ 7. Хоёр таб зэрэг refresh → session устахгүй");

console.log("\nБүх тест давлаа.");
