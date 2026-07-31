import prisma from './prisma.js';

// FR-6.3/6.4
export const PENDING_HOLD_DAYS = 5;
export const MIN_WITHDRAWAL = 50;

// Хэрэглэгчийн ТАТАХ БОЛОМЖТОЙ үлдэгдэл. ESCROW_RELEASE нь батлагдсанаас
// хойш PENDING_HOLD_DAYS хоног (маргааны цонх) өнгөрөх хүртэл эндээс
// хасагдана (computePendingBalance-д харагдана). PENDING WITHDRAWAL
// (админы баталгаажуулалт хүлээж буй) мөн шууд захиалагдсан гэж үзэж
// хасна — эс тэгвэл нэг мөнгийг хоёр удаа татах боломжтой болно.
export async function computeBalance(userId) {
  const now = new Date();
  const [sums, releasedHeld] = await Promise.all([
    prisma.transaction.groupBy({
      by: ['kind'],
      where: {
        userId,
        OR: [
          { kind: { in: ['DEPOSIT', 'ESCROW_HOLD'] }, status: 'COMPLETED' },
          { kind: 'WITHDRAWAL', status: { in: ['COMPLETED', 'PENDING'] } },
        ],
      },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { userId, kind: 'ESCROW_RELEASE', status: 'COMPLETED', OR: [{ availableAt: null }, { availableAt: { lte: now } }] },
      _sum: { amount: true },
    }),
  ]);
  const byKind = Object.fromEntries(sums.map((s) => [s.kind, s._sum.amount || 0]));
  return (byKind.DEPOSIT || 0) + (releasedHeld._sum.amount || 0) - (byKind.WITHDRAWAL || 0) - (byKind.ESCROW_HOLD || 0);
}

// FR-6.3: батлагдсан ч 5 хоногийн маргааны цонхонд хараахан гараагүй дүн
export async function computePendingBalance(userId) {
  const now = new Date();
  const held = await prisma.transaction.aggregate({
    where: { userId, kind: 'ESCROW_RELEASE', status: 'COMPLETED', availableAt: { gt: now } },
    _sum: { amount: true },
  });
  return held._sum.amount || 0;
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
