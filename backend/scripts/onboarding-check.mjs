// Онбординг дээр бөглөсөн зүйл ҮНЭХЭЭР хадгалагдаж байгаа эсэх.
const API = 'http://127.0.0.1:4100';
let pass = 0, fail = 0;

function ok(name, cond, got) {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.error(`  FAIL ${name} -> ${JSON.stringify(got)}`); }
}

async function api(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

const stamp = Date.now();

// ── Гүйцэтгэгч: нэр + availability ──
const fl = await api('/auth/register', {
  method: 'POST',
  body: { email: `onb-fl-${stamp}@test.local`, password: 'Passw0rd!23', name: 'Temp Name', role: 'FREELANCER' },
});
ok('freelancer signup', fl.status === 201 || fl.status === 200, fl.status);
const flToken = fl.json.accessToken;

await api('/profile/account', { method: 'PATCH', token: flToken, body: { name: 'Bat Erdene' } });
const flProfile = await api('/profile/freelancer', {
  method: 'POST',
  token: flToken,
  body: { headline: 'Full-Stack Developer', category: 'Dev', skills: ['React'], availability: 'BUSY' },
});
ok('availability saved', flProfile.json.availability === 'BUSY', flProfile.json.availability);

const me = await api('/auth/me', { token: flToken });
ok('name saved', me.json.name === 'Bat Erdene', me.json.name);

// ── Захиалагч: албан тушаал + багийн хэмжээ ──
const cl = await api('/auth/register', {
  method: 'POST',
  body: { email: `onb-cl-${stamp}@test.local`, password: 'Passw0rd!23', name: 'Client One', role: 'CLIENT' },
});
const clToken = cl.json.accessToken;
const clProfile = await api('/profile/client', {
  method: 'POST',
  token: clToken,
  body: { orgName: 'Nova Studio', contactRole: 'Head of Product', teamSize: '11 – 50' },
});
ok('contactRole saved', clProfile.json.contactRole === 'Head of Product', clProfile.json.contactRole);
ok('teamSize saved', clProfile.json.teamSize === '11 – 50', clProfile.json.teamSize);

const clRead = await api('/profile/client/me', { token: clToken });
ok('client fields read back', clRead.json.contactRole === 'Head of Product' && clRead.json.teamSize === '11 – 50', clRead.json);

// availability нь буруу утга авахгүй байх
const badAvail = await api('/profile/freelancer', {
  method: 'POST',
  token: flToken,
  body: { availability: 'Full-time' },
});
ok('rejects a non-enum availability', badAvail.status === 400, badAvail.status);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
