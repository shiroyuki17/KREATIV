import prisma from './prisma.js';

// Хэрэглэгчийн боломжит үлдэгдэл = орсон мөнгө - гарсан мөнгө.
// ESCROW_HOLD (milestone-д түгжигдсэн) нь боломжит үлдэгдлээс хасагдана —
// ESCROW_RELEASE (batlagdsan milestone-ийн төлбөр) нэмэгдэнэ.
export async function computeBalance(userId) {
  const sums = await prisma.transaction.groupBy({
    by: ['kind'],
    where: { userId, status: 'COMPLETED' },
    _sum: { amount: true },
  });
  const byKind = Object.fromEntries(sums.map((s) => [s.kind, s._sum.amount || 0]));
  return (byKind.DEPOSIT || 0) + (byKind.ESCROW_RELEASE || 0) - (byKind.WITHDRAWAL || 0) - (byKind.ESCROW_HOLD || 0);
}

// Одоогоор ямар нэг идэвхтэй milestone-д түгжигдсэн (сулраагүй) дүн — client-д
// "In escrow" гэсэн бодит статистик харуулахад хэрэглэнэ.
export async function computeEscrowHeld(userId) {
  const held = await prisma.transaction.aggregate({
    where: {
      userId,
      kind: 'ESCROW_HOLD',
      status: 'COMPLETED',
      milestone: { status: { in: ['FUNDED', 'DELIVERED', 'DISPUTED'] } },
    },
    _sum: { amount: true },
  });
  return held._sum.amount || 0;
}
