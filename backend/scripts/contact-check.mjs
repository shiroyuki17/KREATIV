// Холбоо барих формын зурвас бодитоор хадгалагдаж, админд харагдаж
// байгаа эсэх. Өмнө нь энэ урсгал огт байгаагүй — форм нь зөвхөн
// setSent(true) гэж төлөв солиод "илгээгдлээ" гэж худал хэлдэг байв.
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

const stamp = Date.now();
const marker = `contact-check-${stamp}`;

// ── Нээлттэй байх ёстой: бүртгэлгүй хүн ч бичиж чадна ──
const sent = await api('/support/contact', {
  method: 'POST',
  body: {
    name: 'Contact Checker',
    email: `contact-${stamp}@test.local`,
    topic: 'general',
    message: `Энэ бол шалгалтын зурвас: ${marker}`,
  },
});
ok('accepts a message without login', sent.status === 201, [sent.status, sent.json]);
ok('returns the stored id', typeof sent.json.id === 'string', sent.json);

// ── Баталгаажуулалт ──
const short = await api('/support/contact', {
  method: 'POST',
  body: { name: 'A', email: 'not-an-email', topic: 'general', message: 'богино' },
});
ok('rejects an invalid submission', short.status === 400, short.status);

const badTopic = await api('/support/contact', {
  method: 'POST',
  body: {
    name: 'Contact Checker', email: `c2-${stamp}@test.local`,
    topic: 'whatever', message: 'Энэ сэдэв жагсаалтад байхгүй тул татгалзах ёстой.',
  },
});
ok('rejects an unknown topic', badTopic.status === 400, badTopic.status);

// ── Админаас харагдах ёстой (эс бөгөөс хадгалагдсан ч хэн ч харахгүй) ──
const admin = await api('/auth/login', {
  method: 'POST',
  body: { email: process.env.ADMIN_EMAIL || 'admin@kreativ.mn', password: process.env.ADMIN_PASSWORD || '' },
});
if (admin.status !== 200) {
  console.log('  skip админаар нэвтэрч чадсангүй — ADMIN_PASSWORD өгөөгүй бол хэвийн');
} else {
  const token = admin.json.accessToken;
  const list = await api('/admin/support-messages', { token });
  const found = (list.json.messages || []).find((m) => m.message.includes(marker));
  ok('shows up in the admin queue', !!found, list.status);
  ok('counts as pending', list.json.pendingCount >= 1, list.json.pendingCount);

  if (found) {
    const marked = await api(`/admin/support-messages/${found.id}/handled`, { method: 'POST', token, body: { handled: true } });
    ok('can be marked handled', marked.status === 200 && marked.json.handledAt != null, [marked.status, marked.json.handledAt]);

    const stillPending = await api('/admin/support-messages', { token });
    ok('leaves the pending queue once handled',
      !(stillPending.json.messages || []).some((m) => m.id === found.id), stillPending.json.pendingCount);
  }

  // Админ биш хүн энэ жагсаалтад хүрч болохгүй
  const reg = await api('/auth/register', {
    method: 'POST',
    body: { email: `nosy-${stamp}@test.local`, password: 'Passw0rd!23', name: 'Nosy User', role: 'CLIENT' },
  });
  const nosy = await api('/admin/support-messages', { token: reg.json.accessToken });
  ok('is closed to non-admins', nosy.status === 403, nosy.status);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
