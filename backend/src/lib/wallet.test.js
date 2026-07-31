import { beforeEach, describe, expect, it, vi } from 'vitest';

const prisma = {
  transaction: {
    groupBy: vi.fn(),
    aggregate: vi.fn(),
  },
};

vi.mock('./prisma.js', () => ({ default: prisma }));

const wallet = await import('./wallet.js');

describe('wallet ledger calculations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('subtracts escrow holds and pending withdrawals from available balance', async () => {
    prisma.transaction.groupBy.mockResolvedValue([
      { kind: 'DEPOSIT', _sum: { amount: 1000 } },
      { kind: 'ESCROW_HOLD', _sum: { amount: 300 } },
      { kind: 'WITHDRAWAL', _sum: { amount: 150 } },
    ]);
    prisma.transaction.aggregate.mockResolvedValue({ _sum: { amount: 200 } });

    await expect(wallet.computeBalance('user-1')).resolves.toBe(750);
    expect(prisma.transaction.groupBy).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        userId: 'user-1',
        OR: expect.arrayContaining([
          expect.objectContaining({ kind: 'WITHDRAWAL', status: { in: ['COMPLETED', 'PENDING'] } }),
        ]),
      }),
    }));
  });

  it('keeps escrow releases pending until availableAt passes', async () => {
    prisma.transaction.aggregate.mockResolvedValue({ _sum: { amount: 450 } });

    await expect(wallet.computePendingBalance('freelancer-1')).resolves.toBe(450);
    expect(prisma.transaction.aggregate).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        userId: 'freelancer-1',
        kind: 'ESCROW_RELEASE',
        status: 'COMPLETED',
        availableAt: expect.objectContaining({ gt: expect.any(Date) }),
      }),
    }));
  });

  it('reports active escrow held only for funded, delivered, or disputed milestones', async () => {
    prisma.transaction.aggregate.mockResolvedValue({ _sum: { amount: 900 } });

    await expect(wallet.computeEscrowHeld('client-1')).resolves.toBe(900);
    expect(prisma.transaction.aggregate).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        userId: 'client-1',
        kind: 'ESCROW_HOLD',
        status: 'COMPLETED',
        milestone: { status: { in: ['FUNDED', 'DELIVERED', 'DISPUTED'] } },
      }),
    }));
  });
});
