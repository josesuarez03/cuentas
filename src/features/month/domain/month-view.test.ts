import { describe, expect, it } from 'vitest';
import { recomputeView, withEntryAmount, type MonthViewBase } from './month-view';

const base: MonthViewBase = {
  yearMonth: '2026-11',
  status: 'open',
  categories: [
    { id: 'ing', name: 'Ingresos', totalCents: 0, entries: [
      { id: 'e1', kind: 'income', name: 'Nómina', note: 'Pendiente · Mensual · BBVA principal', amountCents: 187000, status: 'pending' },
    ] },
    { id: 'piso', name: 'Piso', totalCents: 0, entries: [
      { id: 'e2', kind: 'expense', name: 'Alquiler', note: 'Mensual · BBVA principal', amountCents: 48000, status: null },
      { id: 'e3', kind: 'expense', name: 'Luz', note: 'Mensual · BBVA principal', amountCents: 4500, status: null },
    ] },
  ],
  pockets: [{ id: 'p', name: 'Ocio', limitCents: 15000, spentCents: 0 }],
  funds: [{ id: 'f', name: 'Regalos', allocatedCents: 5000, balanceCents: 13500 }],
  split: [
    { accountId: 'trade', accountName: 'Trade', percent: 80, cents: 0 },
    { accountId: 'bbva', accountName: 'BBVA ahorro', percent: 20, cents: 0 },
  ],
};

describe('recomputeView', () => {
  it('calcula totales con signo, disponible y reparto', () => {
    const v = recomputeView(base);
    expect(v.categories.map((c) => c.totalCents)).toEqual([187000, -52500]);
    expect(v.calc.availableCents).toBe(187000 - 52500 - 15000 - 5000);
    expect(v.split.map((s) => s.cents)).toEqual([91600, 22900]);
  });
});

describe('withEntryAmount', () => {
  it('cambia un importe y recalcula todo', () => {
    const v = withEntryAmount(recomputeView(base), 'e3', 5200);
    expect(v.categories[1].totalCents).toBe(-53200);
    expect(v.calc.availableCents).toBe(113800);
  });
});
