// Төлбөрийн CSV тайлан бодитоор ашиглагдахуйц гарч байгаа эсэх.
//
// Өмнө нь энэ экспорт нь: талбаруудаа escape хийдэггүй (provider дотор
// таслал байхад мөр нэмэлт багана үүсгэж, өгөгдөл буруу багана руу
// шилждэг), бүх дүнг эерэгээр гаргадаг (орлого зарлага хоёр ялгагдахгүй
// тул баганыг нийлбэрлэхэд утгагүй тоо гарна), огноог түүхий ISO
// timestamp-аар өгдөг (Excel үүнийг огноо гэж танихгүй) байв.
import { prisma } from '../src/lib/prisma.js';

const API = process.env.API_URL || 'http://127.0.0.1:4100';
let pass = 0, fail = 0;

function ok(name, cond, got) {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.error(`  FAIL ${name} -> ${JSON.stringify(got)}`); }
}

async function api(path, { method = 'GET', body, token, raw } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (raw) return { status: res.status, headers: res.headers, buf: Buffer.from(await res.arrayBuffer()) };
  return { status: res.status, json: await res.json().catch(() => ({})) };
}

/** RFC 4180 задлагч — хашилт доторх таслалыг багана гэж тоолохгүй. */
function parseCsvLine(line) {
  const out = [];
  let cur = '', quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') quoted = false;
      else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

const stamp = Date.now();
const email = `export-check-${stamp}@test.local`;
const reg = await api('/auth/register', {
  method: 'POST',
  body: { email, password: 'Passw0rd!23', name: 'Export Checker', role: 'CLIENT' },
});
if (reg.status !== 201) {
  console.error('  FAIL бүртгэл үүсгэж чадсангүй ->', reg.status, reg.json);
  process.exit(1);
}
const token = reg.json.accessToken;
const user = await prisma.user.findUnique({ where: { email } });

// ── Гүйлгээ байхгүй үед зөвхөн толгой мөр ──
const empty = await api('/payments/export', { token, raw: true });
const emptyText = empty.buf.toString('utf8').replace(/^﻿/, '');
ok('гүйлгээгүй үед зөвхөн толгой мөр', emptyText.trim().split(/\r\n/).length === 1, emptyText);

// ── Бодит гүйлгээнүүд ──
const now = Date.now();
const seed = [
  { kind: 'DEPOSIT', amount: 500, provider: 'qpay_demo' },
  { kind: 'ESCROW_HOLD', amount: 300, provider: 'internal' },
  { kind: 'ESCROW_RELEASE', amount: 300, provider: 'internal' },
  // Таслал агуулсан утга — escaping-гүй бол энэ мөр нэмэлт багана үүсгэнэ.
  { kind: 'WITHDRAWAL', amount: 120, provider: 'Bank of Ulaanbaatar, branch 4' },
];
for (const [i, s] of seed.entries()) {
  const at = new Date(now - (seed.length - i) * 86400000);
  await prisma.transaction.create({
    data: { userId: user.id, kind: s.kind, status: 'COMPLETED', amount: s.amount, provider: s.provider, createdAt: at, completedAt: at },
  });
}
// COMPLETED биш — тайланд гарах ёсгүй.
await prisma.transaction.create({
  data: { userId: user.id, kind: 'WITHDRAWAL', status: 'PENDING', amount: 999, provider: 'qpay_demo' },
});

const res = await api('/payments/export?lang=mn', { token, raw: true });
ok('200 буцаана', res.status === 200, res.status);
ok('UTF-8 BOM-той (Excel кирилл толгойг зөв уншина)',
  res.buf.subarray(0, 3).toString('hex') === 'efbbbf', res.buf.subarray(0, 3).toString('hex'));
ok('файлын нэр огноотой',
  /filename="kreativ-transactions-\d{4}-\d{2}-\d{2}\.csv"/.test(res.headers.get('content-disposition') || ''),
  res.headers.get('content-disposition'));

const text = res.buf.toString('utf8').replace(/^﻿/, '');
const lines = text.split('\r\n').filter((l) => l !== '');
ok('толгой + 4 мөр (PENDING орохгүй)', lines.length === 5, lines.length);

const header = parseCsvLine(lines[0]);
const rows = lines.slice(1).map(parseCsvLine);
ok('мөр бүр толгойтойгоо ижил багантай (escaping ажиллаж байна)',
  rows.every((r) => r.length === header.length), rows.map((r) => r.length));

const iAmount = header.indexOf('Дүн (USD)');
const iDate = header.indexOf('Огноо');
const iDir = header.indexOf('Чиглэл');
const iProvider = header.indexOf('Provider');
ok('хүлээгдэж буй багануудтай', iAmount > -1 && iDate > -1 && iDir > -1 && iProvider > -1, header);

ok('таслалтай утга бүтнээрээ нэг баганад үлдсэн',
  rows.some((r) => r[iProvider] === 'Bank of Ulaanbaatar, branch 4'), rows.map((r) => r[iProvider]));

ok('огноо нь Excel уншдаг YYYY-MM-DD',
  rows.every((r) => /^\d{4}-\d{2}-\d{2}$/.test(r[iDate])), rows.map((r) => r[iDate]));

const amounts = rows.map((r) => Number(r[iAmount]));
ok('дүн бүр тоо', amounts.every(Number.isFinite), rows.map((r) => r[iAmount]));
ok('зарлага сөрөг тэмдэгтэй', amounts.some((a) => a < 0), amounts);
ok('орлого эерэг тэмдэгтэй', amounts.some((a) => a > 0), amounts);
// 500 - 300 + 300 - 120 = 380
ok('баганын нийлбэр цэвэр дүнг өгнө', amounts.reduce((s, a) => s + a, 0) === 380, amounts);

// ── Хэл ──
const en = await api('/payments/export?lang=en', { token, raw: true });
const enHeader = parseCsvLine(en.buf.toString('utf8').replace(/^﻿/, '').split('\r\n')[0]);
ok('англи толгой мөр', enHeader.includes('Amount (USD)') && enHeader.includes('Date'), enHeader);
const enRow = parseCsvLine(en.buf.toString('utf8').replace(/^﻿/, '').split('\r\n')[1]);
ok('англи үед төрөл ч орчуулагдана', /^[\x20-\x7E]+$/.test(enRow[enHeader.indexOf('Type')]), enRow);

// ── Хамгаалалт: өөр хүний гүйлгээ орохгүй ──
const other = await api('/auth/register', {
  method: 'POST',
  body: { email: `export-other-${stamp}@test.local`, password: 'Passw0rd!23', name: 'Other', role: 'CLIENT' },
});
const otherCsv = await api('/payments/export', { token: other.json.accessToken, raw: true });
ok('өөр хэрэглэгчид зөвхөн өөрийнх нь (хоосон) тайлан харагдана',
  otherCsv.buf.toString('utf8').replace(/^﻿/, '').trim().split(/\r\n/).length === 1, otherCsv.status);

const anon = await api('/payments/export');
ok('нэвтрээгүй үед хаалттай', anon.status === 401, anon.status);

await prisma.$disconnect();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
