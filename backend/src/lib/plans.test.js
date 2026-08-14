import { describe, it, expect } from 'vitest';
import { PLANS, effectivePlan, publicPlans, stripePriceIdFor } from './plans.js';

describe('effectivePlan', () => {
  it('захиалгагүй хэрэглэгч Starter дээр байна', () => {
    expect(effectivePlan(null).key).toBe('starter');
    expect(effectivePlan(undefined).key).toBe('starter');
  });

  it('ACTIVE захиалга нь тухайн багцын эрхийг өгнө', () => {
    expect(effectivePlan({ status: 'ACTIVE', planKey: 'pro' }).key).toBe('pro');
    expect(effectivePlan({ status: 'ACTIVE', planKey: 'pro' }).commissionPct).toBe(5);
  });

  // Stripe төлбөрийг хэд хэдэн удаа дахин оролддог. Нэг амжилтгүй
  // оролдлогоор эрхийг тасалбал төлж байгаа хэрэглэгчийг шийтгэсэн болно —
  // Stripe эцэст нь CANCELED болгоно, тэр үед л эрх хаагдана.
  it('PAST_DUE үед эрх хэвээр (Stripe дахин оролдож байна)', () => {
    expect(effectivePlan({ status: 'PAST_DUE', planKey: 'pro' }).key).toBe('pro');
  });

  it('CANCELED / PENDING / NONE үед Starter руу буцна', () => {
    for (const status of ['CANCELED', 'PENDING', 'NONE']) {
      expect(effectivePlan({ status, planKey: 'pro' }).key).toBe('starter');
    }
  });

  it('танихгүй planKey нь Starter руу унана (эрх алдагдахгүй)', () => {
    expect(effectivePlan({ status: 'ACTIVE', planKey: 'platinum' }).key).toBe('starter');
  });
});

describe('publicPlans', () => {
  it('Stripe Price тохируулаагүй үед Pro-г "худалдаж авах боломжтой" гэж ХУДЛАА хэлэхгүй', () => {
    // Тестийн орчинд STRIPE_PRICE_PRO_MONTHLY тохируулаагүй.
    const pro = publicPlans().find((p) => p.key === 'pro');
    expect(pro.purchasable).toBe(false);
  });

  it('үнэгүй/захиалгат бус багцууд хэзээ ч purchasable биш', () => {
    const plans = publicPlans();
    expect(plans.find((p) => p.key === 'starter').purchasable).toBe(false);
  });

  it('комиссын хувь нь plans.js-ийн эх сурвалжтай таарна', () => {
    const plans = publicPlans();
    expect(plans.find((p) => p.key === 'starter').commissionPct).toBe(PLANS.starter.commissionPct);
    expect(plans.find((p) => p.key === 'pro').commissionPct).toBe(PLANS.pro.commissionPct);
  });
});

describe('stripePriceIdFor', () => {
  it('Pro биш багцад Price ID байхгүй', () => {
    expect(stripePriceIdFor('starter', 'monthly')).toBeNull();
    // Багцын жагсаалтад байхгүй түлхүүр ирсэн ч (жишээ нь хуучин
    // захиалгын planKey) Price ID зохиож гаргахгүй.
    expect(stripePriceIdFor('enterprise', 'yearly')).toBeNull();
  });
});
