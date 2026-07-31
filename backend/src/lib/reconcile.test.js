import { beforeEach, describe, expect, it, vi } from 'vitest';

const prisma = {
  milestone: { findMany: vi.fn() },
  user: { count: vi.fn() },
  $queryRaw: vi.fn(),
};

vi.mock('./prisma.js', () => ({ default: prisma }));

const { runReconciliation } = await import('./reconcile.js');

describe('runReconciliation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.user.count.mockResolvedValue(3);
    prisma.$queryRaw.mockResolvedValue([]);
  });

  it('passes a balanced escrow ledger', async () => {
    prisma.milestone.findMany.mockResolvedValue([
      {
        id: 'm1',
        title: 'Approved',
        status: 'APPROVED',
        transactions: [
          { kind: 'ESCROW_HOLD', amount: 1000 },
          { kind: 'ESCROW_RELEASE', amount: 900 },
        ],
      },
      {
        id: 'm2',
        title: 'Still held',
        status: 'FUNDED',
        transactions: [{ kind: 'ESCROW_HOLD', amount: 500 }],
      },
    ]);

    const report = await runReconciliation();

    expect(report.ok).toBe(true);
    expect(report.issuesFound).toBe(0);
    expect(report.milestonesChecked).toBe(2);
  });

  it('flags overpayment, unpaid approvals, premature release, and negative balances', async () => {
    prisma.milestone.findMany.mockResolvedValue([
      {
        id: 'overpaid',
        title: 'Overpaid',
        status: 'APPROVED',
        transactions: [
          { kind: 'ESCROW_HOLD', amount: 100 },
          { kind: 'ESCROW_RELEASE', amount: 120 },
        ],
      },
      {
        id: 'unpaid',
        title: 'Unpaid',
        status: 'APPROVED',
        transactions: [{ kind: 'ESCROW_HOLD', amount: 200 }],
      },
      {
        id: 'early',
        title: 'Early',
        status: 'DELIVERED',
        transactions: [
          { kind: 'ESCROW_HOLD', amount: 300 },
          { kind: 'ESCROW_RELEASE', amount: 100 },
        ],
      },
    ]);
    prisma.$queryRaw.mockResolvedValue([{ userId: 'user-negative', balance: -50 }]);

    const report = await runReconciliation();

    expect(report.ok).toBe(false);
    expect(report.issues.map((issue) => issue.type)).toEqual(expect.arrayContaining([
      'OVERPAYMENT',
      'APPROVED_BUT_UNPAID',
      'PREMATURE_RELEASE',
      'NEGATIVE_BALANCE',
    ]));
  });
});
