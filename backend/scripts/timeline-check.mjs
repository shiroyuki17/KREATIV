// Зар нийтлэхэд сонгосон хугацаа хадгалагдаж, буцаж уншигдаж байгаа эсэх.
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
const reg = await api('/auth/register', {
  method: 'POST',
  body: { email: `tl-${stamp}@test.local`, password: 'Passw0rd!23', name: 'Timeline Client', role: 'CLIENT' },
});
const token = reg.json.accessToken;
await api('/profile/client', { method: 'POST', token, body: { orgName: 'Timeline Co' } });

const created = await api('/jobs', {
  method: 'POST', token,
  body: {
    title: 'Build a booking flow for a small studio',
    description: 'We need a complete booking flow with payments, and a simple admin view.',
    category: 'Dev',
    skills: ['React'],
    budgetType: 'FIXED',
    budgetMin: 3000,
    budgetMax: 3000,
    timeline: '2-4w',
  },
});
ok('creates a job with a timeline', created.status === 201 || created.status === 200, created.status);
ok('stores the timeline', created.json.timeline === '2-4w', created.json.timeline);

const read = await api(`/jobs/${created.json.id}`);
ok('returns the timeline on read', read.json.timeline === '2-4w', read.json.timeline);

// Жагсаалтад ч ирэх ёстой (карт дээр харуулах боломжтой байхын тулд)
const list = await api('/jobs?category=Dev&pageSize=50');
const found = (list.json.jobs || []).find((j) => j.id === created.json.id);
ok('returns the timeline in the list', found?.timeline === '2-4w', found?.timeline);

// Жагсаалтаас гадуурх утга татгалзана
const bad = await api('/jobs', {
  method: 'POST', token,
  body: {
    title: 'A brief with a nonsense timeline value',
    description: 'This should be refused because the timeline is not one of the allowed values.',
    category: 'Dev', budgetType: 'FIXED', budgetMin: 100, budgetMax: 100,
    timeline: 'whenever',
  },
});
ok('refuses an unknown timeline', bad.status === 400, bad.status);

// Хугацаа заавал биш
const noTl = await api('/jobs', {
  method: 'POST', token,
  body: {
    title: 'A brief with no timeline chosen at all',
    description: 'The timeline is optional, so leaving it out must still be accepted.',
    category: 'Dev', budgetType: 'FIXED', budgetMin: 100, budgetMax: 100,
  },
});
ok('timeline stays optional', (noTl.status === 200 || noTl.status === 201) && noTl.json.timeline == null, [noTl.status, noTl.json.timeline]);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
