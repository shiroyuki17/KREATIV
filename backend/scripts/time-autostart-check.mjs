// Ажил авмагц тоолуур явж эхэлдэг, өдөр бүр шөнө дунд таслагддаг эсэх.
//
// Өмнө нь фрилансер "Start" дарж байж л цаг бүртгэгддэг байсан — дарахаа
// мартвал ажилласан цаг нь бүрмөсөн алдагддаг. Одоо гэрээ үүсэх мөчид
// тоолуур асна. Асаалттай тоолуур хэд хоног үргэлжилбэл нэг бүртгэл
// хэдэн зуун цаг харуулахгүйн тулд өдрийн заагаар тасална.
import { prisma } from '../src/lib/prisma.js';
import { nextLocalMidnight, rollOverRunningEntries, ensureTimerRunning } from '../src/lib/timeEntries.js';

const API = process.env.API_URL || 'http://127.0.0.1:4100';
let pass = 0, fail = 0;
const ok = (name, cond, got) => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.error(`  FAIL ${name} -> ${JSON.stringify(got)}`); }
};

async function api(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: await res.json().catch(() => ({})) };
}

const stamp = Date.now();
const reg = async (role, tag) => {
  const email = `time-${tag}-${stamp}@test.local`;
  const r = await api('/auth/register', {
    method: 'POST',
    body: { email, password: 'Passw0rd!23', name: `Time ${tag}`, role },
  });
  return { token: r.json.accessToken, user: await prisma.user.findUnique({ where: { email } }) };
};

// ── 1. nextLocalMidnight нь UB-ийн шөнө дундыг олж байна уу ──
// UB = UTC+8, тиймээс локал шөнө дунд нь UTC 16:00.
const probe = nextLocalMidnight(new Date('2026-08-14T03:00:00Z'));
ok('шөнө дунд UB-ийн бүсээр тооцогдоно (UTC 16:00)',
  probe.toISOString() === '2026-08-14T16:00:00.000Z', probe.toISOString());

const justBefore = nextLocalMidnight(new Date('2026-08-14T15:59:00Z'));
ok('заагийн өмнөх минутад тухайн өдрийн заагийг өгнө',
  justBefore.toISOString() === '2026-08-14T16:00:00.000Z', justBefore.toISOString());

const justAfter = nextLocalMidnight(new Date('2026-08-14T16:00:00Z'));
ok('заагийн дараа дараагийн өдрийн заагийг өгнө',
  justAfter.toISOString() === '2026-08-15T16:00:00.000Z', justAfter.toISOString());

// ── 2. Гэрээ үүсэхэд тоолуур автоматаар асна ──
const client = await reg('CLIENT', 'cl');
const freelancer = await reg('FREELANCER', 'fl');

// Профайл нь бүртгэлээр биш, onboarding-оор үүсдэг.
await api('/profile/client', {
  method: 'POST', token: client.token,
  body: { orgName: 'Time Check Studio', contactRole: 'Head of Product', teamSize: '11 – 50' },
});
await api('/profile/freelancer', {
  method: 'POST', token: freelancer.token,
  body: { headline: 'Full-Stack Developer', category: 'Dev', skills: ['React'], availability: 'OPEN' },
});

const clientProfile = await prisma.clientProfile.findUnique({ where: { userId: client.user.id } });
const flProfile = await prisma.freelancerProfile.findUnique({ where: { userId: freelancer.user.id } });
if (!clientProfile || !flProfile) {
  console.error('  FAIL профайл үүсээгүй —', { clientProfile: !!clientProfile, flProfile: !!flProfile });
  process.exit(1);
}

const job = await prisma.job.create({
  data: {
    clientId: clientProfile.id, title: `Time check ${stamp}`, description: 'x'.repeat(60),
    category: 'Development & IT', budgetType: 'FIXED', budgetMin: 100, budgetMax: 100, status: 'OPEN',
  },
});
const proposal = await prisma.proposal.create({
  data: { jobId: job.id, freelancerId: flProfile.id, price: 100, durationDays: 3, coverLetter: 'y'.repeat(30) },
});

const accepted = await api(`/proposals/${proposal.id}/accept`, {
  method: 'POST', token: client.token, body: { milestones: [{ title: 'Bүх ажил', amount: 100 }] },
});
ok('санал зөвшөөрөгдөж гэрээ үүслээ', accepted.status === 201, [accepted.status, accepted.json]);
const contractId = accepted.json.id;

// Автоматаар асаах нь хариултын дараа хийгддэг тул богино хүлээнэ.
await new Promise((r) => setTimeout(r, 400));

const view = await api(`/contracts/${contractId}/time`, { token: freelancer.token });
ok('гэрээ үүсмэгц тоолуур ажиллаж байна', view.json.running != null, view.json);
ok('тоолуур гүйцэтгэгчид харагдана', view.json.canTrack === true, view.json.canTrack);

const clientView = await api(`/contracts/${contractId}/time`, { token: client.token });
ok('захиалагч харна, гэхдээ бүртгэхгүй',
  clientView.status === 200 && clientView.json.canTrack === false, clientView.json.canTrack);

// ── 3. Хоёр дахин асаах гэвэл давхар тоолуур үүсэхгүй ──
await ensureTimerRunning(contractId);
const doubles = await prisma.timeEntry.count({ where: { contractId, endedAt: null } });
ok('нэг гэрээнд нэг л ажиллаж буй тоолуур', doubles === 1, doubles);

// ── 4. Шөнө дунд таслах ──
// Ажиллаж буй бүртгэлийг 3 хоногийн өмнөх болгоод rollover-ыг ажиллуулна.
const running = await prisma.timeEntry.findFirst({ where: { contractId, endedAt: null } });
const threeDaysAgo = new Date(Date.now() - 3 * 86400000);
await prisma.timeEntry.update({ where: { id: running.id }, data: { startedAt: threeDaysAgo } });

await rollOverRunningEntries(contractId);

const entries = await prisma.timeEntry.findMany({ where: { contractId }, orderBy: { startedAt: 'asc' } });
ok('гурван хоног гаталсан бүртгэл өдрүүдэд хуваагдлаа', entries.length >= 4, entries.length);
ok('таслагдсаны дараа ч ганц тоолуур ажиллаж байна',
  entries.filter((e) => !e.endedAt).length === 1, entries.filter((e) => !e.endedAt).length);
ok('бүртгэл бүр 24 цагаас хэтрэхгүй',
  entries.filter((e) => e.endedAt).every((e) => e.endedAt - e.startedAt <= 24 * 3600 * 1000 + 1000),
  entries.filter((e) => e.endedAt).map((e) => (e.endedAt - e.startedAt) / 3600000));
ok('таслалт нь UB-ийн шөнө дунд дээр тохирно',
  entries.filter((e) => e.endedAt).every((e) => e.endedAt.getUTCHours() === 16 && e.endedAt.getUTCMinutes() === 0),
  entries.filter((e) => e.endedAt).map((e) => e.endedAt.toISOString()));

// Нийт хугацаа нь бодит хугацаанаас хэтрэхгүй (давхардал үүсээгүй).
const totalSec = entries.reduce((s, e) => s + ((e.endedAt || new Date()) - e.startedAt) / 1000, 0);
const wallSec = (Date.now() - threeDaysAgo.getTime()) / 1000;
ok('нийт цаг нь бодит өнгөрсөн хугацаатай тэнцэнэ (давхардалгүй)',
  Math.abs(totalSec - wallSec) < 5, [totalSec, wallSec]);

// ── 5. Гэрээ дуусвал дахин нээхгүй ──
await prisma.contract.update({ where: { id: contractId }, data: { status: 'COMPLETED' } });
const stillRunning = await prisma.timeEntry.findFirst({ where: { contractId, endedAt: null } });
await prisma.timeEntry.update({
  where: { id: stillRunning.id }, data: { startedAt: new Date(Date.now() - 2 * 86400000) },
});
await rollOverRunningEntries(contractId);
const afterComplete = await prisma.timeEntry.count({ where: { contractId, endedAt: null } });
ok('дууссан гэрээнд шинэ тоолуур нээгдэхгүй', afterComplete === 0, afterComplete);

await prisma.$disconnect();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
