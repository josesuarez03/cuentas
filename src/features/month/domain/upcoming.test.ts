import { describe, expect, it } from 'vitest';
import type { TemplateItem } from './generation';
import { upcomingFor } from './upcoming';

const item = (over: Partial<TemplateItem>): TemplateItem => ({
  id: 'i1', name: 'X', kind: 'expense', categoryId: 'c', accountId: 'a', amountCents: 1000,
  frequency: 'monthly', startMonth: '2026-10', anchorMonth: null, installmentsTotal: null, active: true,
  ...over,
});

const items = [
  item({ id: 'nomina', name: 'Nómina', kind: 'income', amountCents: 187000 }),
  item({ id: 'gas', name: 'Gas', frequency: 'bimonthly', amountCents: 2800 }),
  item({ id: 'portatil', name: 'Portátil', frequency: 'installments', installmentsTotal: 6, amountCents: 10000 }),
  item({ id: 'prime', name: 'Prime', frequency: 'annual', anchorMonth: 3, amountCents: 4990 }),
  item({ id: 'seguro', name: 'Seguro', frequency: 'annual', anchorMonth: 12, amountCents: 30000, active: false }),
];

describe('upcomingFor', () => {
  it('solo lo no mensual y activo, con el último importe (salvo cuotas)', () => {
    const up = upcomingFor(items, new Map([['gas', 3100], ['portatil', 9999], ['nomina', 179000]]), '2026-12');
    expect(up).toEqual({
      yearMonth: '2026-12',
      items: [
        { id: 'gas', name: 'Gas', note: 'cada 2 meses', signedCents: -3100 },
        { id: 'portatil', name: 'Portátil', note: 'cuota 3 de 6', signedCents: -10000 },
      ],
      totalCents: -13100,
    });
  });
  it('anual en su mes y última cuota', () => {
    const up = upcomingFor(items, new Map(), '2027-03');
    expect(up.items).toEqual([
      { id: 'portatil', name: 'Portátil', note: 'cuota 6 de 6', signedCents: -10000 },
      { id: 'prime', name: 'Prime', note: 'anual', signedCents: -4990 },
    ]);
    expect(up.totalCents).toBe(-14990);
  });
  it('vacío cuando no toca nada (cuotas ya terminadas)', () => {
    expect(upcomingFor(items, new Map(), '2027-05')).toEqual({ yearMonth: '2027-05', items: [], totalCents: 0 });
  });
  it('un ingreso no mensual suma con signo +', () => {
    const extra = item({ id: 'extra', name: 'Paga extra', kind: 'income', frequency: 'annual', anchorMonth: 12, amountCents: 50000 });
    expect(upcomingFor([extra], new Map(), '2026-12').items).toEqual([
      { id: 'extra', name: 'Paga extra', note: 'anual', signedCents: 50000 },
    ]);
  });
});
