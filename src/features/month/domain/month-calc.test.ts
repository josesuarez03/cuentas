import { describe, expect, it } from 'vitest';
import { computeMonth, splitSavings, type CalcInput } from './month-calc';

const base: CalcInput = {
  status: 'open',
  entries: [
    { kind: 'income', amountCents: 187000 },
    { kind: 'expense', amountCents: 63000 },
    { kind: 'expense', amountCents: 36889 },
  ],
  fundAllocationsCents: 5000,
  pockets: [
    { limitCents: 15000, spentCents: 9200 },
    { limitCents: 10000, spentCents: 11200 },
  ],
  split: [{ accountId: 'trade', percent: 80 }, { accountId: 'bbva', percent: 20 }],
};

describe('computeMonth', () => {
  it('mes abierto: cada bolsa reserva su límite o lo gastado si se pasa', () => {
    const r = computeMonth(base);
    expect(r).toMatchObject({ incomeCents: 187000, expenseCents: 99889, fundsCents: 5000, pocketsCents: 26200, availableCents: 55911 });
  });
  it('mes cerrado: las bolsas cuentan solo lo gastado (lo que sobra va al ahorro)', () => {
    const r = computeMonth({ ...base, status: 'closed' });
    expect(r.pocketsCents).toBe(20400);
    expect(r.availableCents).toBe(61711);
  });
  it('los préstamos dados restan y las devoluciones suman', () => {
    const r = computeMonth({ ...base, pockets: [], fundAllocationsCents: 0, entries: [
      { kind: 'income', amountCents: 100000 },
      { kind: 'loan_out', amountCents: 20000 },
      { kind: 'loan_repayment', amountCents: 5000 },
    ] });
    expect(r.availableCents).toBe(85000);
  });
});

describe('splitSavings', () => {
  it('reparte al céntimo; el resto va al mayor porcentaje', () => {
    expect(splitSavings(55911, base.split)).toEqual([
      { accountId: 'trade', cents: 44729 },
      { accountId: 'bbva', cents: 11182 },
    ]);
  });
  it('sin disponible no reparte nada', () => {
    expect(splitSavings(-500, base.split)).toEqual([
      { accountId: 'trade', cents: 0 },
      { accountId: 'bbva', cents: 0 },
    ]);
  });
});
