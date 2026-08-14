// Нууц үг солих урсгал ҮНЭХЭЭР ажиллаж байгаа эсэх.
const API = 'http://127.0.0.1:4100';
let pass = 0, fail = 0;

function ok(name, cond, got) {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.error(`  FAIL ${name} -> ${JSON.stringify(got)}`); }
}

async function api(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: await res.json().catch(() => ({})) };
}

const email = `pw-${Date.now()}@test.local`;
const OLD = 'OldPassw0rd!';
const NEW = 'NewPassw0rd!';

const reg = await api('/auth/register', {
  method: 'POST',
  body: { email, password: OLD, name: 'Pw Test', role: 'FREELANCER' },
});
ok('register', reg.status === 200 || reg.status === 201, reg.status);
const token = reg.json.accessToken;
const oldRefresh = reg.json.refreshToken;

// Буруу одоогийн нууц үг татгалзана
const wrong = await api('/auth/password', {
  method: 'PATCH', token,
  body: { currentPassword: 'NotThePassword!', newPassword: NEW },
});
ok('rejects a wrong current password', wrong.status === 400, wrong.status);

// Хэт богино шинэ нууц үг татгалзана
const short = await api('/auth/password', {
  method: 'PATCH', token,
  body: { currentPassword: OLD, newPassword: 'abc' },
});
ok('rejects a too-short new password', short.status === 400, short.status);

// Зөв солилт
const changed = await api('/auth/password', {
  method: 'PATCH', token,
  body: { currentPassword: OLD, newPassword: NEW },
});
ok('changes the password', changed.status === 200, changed.status);
ok('returns a fresh refresh token', typeof changed.json.refreshToken === 'string' && changed.json.refreshToken.length > 20, Object.keys(changed.json));

// Хуучин нууц үгээр нэвтэрч болохгүй
const oldLogin = await api('/auth/login', { method: 'POST', body: { email, password: OLD } });
ok('old password no longer works', oldLogin.status === 401 || oldLogin.status === 400, oldLogin.status);

// Шинэ нууц үгээр нэвтэрнэ
const newLogin = await api('/auth/login', { method: 'POST', body: { email, password: NEW } });
ok('new password works', newLogin.status === 200, newLogin.status);

// Буцаасан шинэ refresh token ажиллана (энэ төхөөрөмж гараагүй).
//
// ⚠️ Дарааллыг СОЛИЖ БОЛОХГҮЙ: хүчингүй болсон token-ыг эхэлж үзүүлбэл
// /auth/refresh нь түүнийг хулгайлагдсан гэж үзээд тухайн хэрэглэгчийн БҮХ
// session-ийг (энэ шинэ token-ыг ч оруулаад) устгадаг. Тэр нь зөв зан
// төлөв — гэхдээ дараа нь энэ шалгуур хуурамчаар унана.
const newRefreshTry = await api('/auth/refresh', { method: 'POST', body: { refreshToken: changed.json.refreshToken } });
ok('this device stays signed in', newRefreshTry.status === 200, newRefreshTry.status);

// Хуучин refresh token хүчингүй болсон (бусад төхөөрөмж гарсан)
const oldRefreshTry = await api('/auth/refresh', { method: 'POST', body: { refreshToken: oldRefresh } });
ok('the old session was revoked', oldRefreshTry.status >= 400, oldRefreshTry.status);

// Нэвтрээгүй бол хаалттай
const anon = await api('/auth/password', { method: 'PATCH', body: { currentPassword: OLD, newPassword: NEW } });
ok('requires authentication', anon.status === 401, anon.status);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
