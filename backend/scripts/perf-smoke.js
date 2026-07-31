const API_BASE = process.env.API_BASE || `http://localhost:${process.env.PORT || 4100}`;
const TOKEN = process.env.ACCESS_TOKEN || process.env.TOKEN || '';

const checks = [
  { name: 'health', path: '/health', maxMs: 500 },
  { name: 'jobs', path: '/jobs?pageSize=10', maxMs: 1200 },
  { name: 'metrics', path: '/metrics', maxMs: 1200 },
];

if (TOKEN) {
  checks.push(
    { name: 'balance', path: '/payments/balance', maxMs: 1200, auth: true },
    { name: 'contracts', path: '/contracts/mine', maxMs: 1500, auth: true },
  );
}

async function timeCheck(check) {
  const started = performance.now();
  const res = await fetch(`${API_BASE}${check.path}`, {
    headers: check.auth ? { Authorization: `Bearer ${TOKEN}` } : undefined,
  });
  const ms = Math.round(performance.now() - started);
  const body = await res.text();
  return {
    ...check,
    status: res.status,
    ms,
    ok: res.ok && ms <= check.maxMs,
    sample: body.slice(0, 120).replace(/\s+/g, ' '),
  };
}

const results = [];
for (const check of checks) {
  try {
    results.push(await timeCheck(check));
  } catch (error) {
    results.push({ ...check, status: 0, ms: 0, ok: false, sample: error.message });
  }
}

for (const r of results) {
  console.log(`${r.ok ? 'OK' : 'FAIL'} ${r.name} ${r.status} ${r.ms}ms <= ${r.maxMs}ms`);
  if (!r.ok) console.log(`  ${r.sample}`);
}

process.exit(results.every((r) => r.ok) ? 0 : 1);
