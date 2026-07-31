// NFR-1 — Мөнгөний зөв байдал. "Тусдаа баланс багана байхгүй, бүх зүйл
// ledger-ээс тооцогддог" зарчмыг баталгаажуулдаг өдрийн шалгалт: escrow-д
// орсон мөнгө (ESCROW_HOLD) хэзээ ч зөвшөөрснөөс илүү гараагүй эсэх,
// APPROVED milestone бүр бодитоор мөнгөө гаргасан эсэх, идэвхтэй
// (FUNDED/DELIVERED/DISPUTED) milestone-ийн escrow хэн ч хөндөөгүй эсэхийг
// milestone тус бүрээр нь шалгана. Render free tier-д cron/Shell байхгүй тул
// энэ функцийг admin route (`GET /admin/reconciliation`)-оос дуудна.
import prisma from './prisma.js';

export async function runReconciliation() {
  const milestones = await prisma.milestone.findMany({
    include: { transactions: { where: { status: 'COMPLETED' } } },
  });

  const issues = [];
  let checked = 0;

  for (const m of milestones) {
    const hold = m.transactions.filter((t) => t.kind === 'ESCROW_HOLD').reduce((s, t) => s + t.amount, 0);
    if (hold === 0) continue; // хэзээ ч санхүүжээгүй — шалгах шаардлагагүй
    checked++;

    const release = m.transactions.filter((t) => t.kind === 'ESCROW_RELEASE').reduce((s, t) => s + t.amount, 0);
    const refund = m.transactions
      .filter((t) => t.kind === 'DEPOSIT' && ['dispute_refund', 'dispute_split'].includes(t.provider))
      .reduce((s, t) => s + t.amount, 0);
    const paidOut = release + refund;

    if (paidOut > hold) {
      issues.push({ milestoneId: m.id, title: m.title, type: 'OVERPAYMENT', detail: `hold=${hold}, paidOut=${paidOut}` });
    }
    if (m.status === 'APPROVED' && paidOut === 0) {
      issues.push({ milestoneId: m.id, title: m.title, type: 'APPROVED_BUT_UNPAID', detail: `status=APPROVED гэвч escrow-оос мөнгө гараагүй (hold=${hold})` });
    }
    if (['FUNDED', 'DELIVERED', 'DISPUTED'].includes(m.status) && paidOut > 0) {
      issues.push({ milestoneId: m.id, title: m.title, type: 'PREMATURE_RELEASE', detail: `status=${m.status} гэвч escrow-оос ${paidOut} аль хэдийн гарсан байна` });
    }
  }

  // Хэрэглэгч бүрийн боломжит үлдэгдэл сөрөг болохгүй байх ёстой
  const negativeBalances = await prisma.$queryRaw`
    SELECT "userId",
      SUM(CASE WHEN kind = 'DEPOSIT' THEN amount WHEN kind = 'ESCROW_RELEASE' THEN amount ELSE 0 END)
      - SUM(CASE WHEN kind = 'WITHDRAWAL' THEN amount WHEN kind = 'ESCROW_HOLD' THEN amount ELSE 0 END) AS balance
    FROM "Transaction"
    WHERE status = 'COMPLETED'
    GROUP BY "userId"
    HAVING SUM(CASE WHEN kind = 'DEPOSIT' THEN amount WHEN kind = 'ESCROW_RELEASE' THEN amount ELSE 0 END)
      - SUM(CASE WHEN kind = 'WITHDRAWAL' THEN amount WHEN kind = 'ESCROW_HOLD' THEN amount ELSE 0 END) < 0
  `;
  for (const row of negativeBalances) {
    issues.push({ userId: row.userId, type: 'NEGATIVE_BALANCE', detail: `balance=${row.balance}` });
  }

  return {
    ranAt: new Date().toISOString(),
    milestonesChecked: checked,
    usersChecked: await prisma.user.count(),
    issuesFound: issues.length,
    issues,
    ok: issues.length === 0,
  };
}
