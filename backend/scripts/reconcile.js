// `npm run reconcile` — Render free tier-д cron байхгүй тул гараар/сар
// шинэ deploy бүрд ажиллуулах зорилготой standalone скрипт. Ижил логикийг
// GET /admin/reconciliation ч ашигладаг (src/lib/reconcile.js).
import { runReconciliation } from '../src/lib/reconcile.js';
import prisma from '../src/lib/prisma.js';

const report = await runReconciliation();
console.log(JSON.stringify(report, null, 2));
await prisma.$disconnect();
process.exit(report.ok ? 0 : 1);
