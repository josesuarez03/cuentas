import { describe, expect, it } from 'vitest';
import {
  isMonthEmpty, pocketProgress, recomputeView, withEntryAmount, withIncomeConfirmed, type MonthViewBase,
} from './month-view';

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

describe('isMonthEmpty', () => {
  it('vacío sin partidas, bolsas ni huchas', () => {
    expect(isMonthEmpty({ ...base, categories: [], pockets: [], funds: [] })).toBe(true);
    expect(isMonthEmpty({ ...base, categories: [], funds: [] })).toBe(false);
    expect(isMonthEmpty(base)).toBe(false);
  });
});

describe('withIncomeConfirmed', () => {
  it('confirma el ingreso y quita «Pendiente» de la nota sin tocar el disponible', () => {
    const before = recomputeView(base);
    const v = withIncomeConfirmed(before, 'e1');
    const nomina = v.categories[0].entries[0];
    expect(nomina.status).toBe('confirmed');
    expect(nomina.note).toBe('Mensual · BBVA principal');
    expect(v.calc.availableCents).toBe(before.calc.availableCents);
  });
  it('no toca otras partidas', () => {
    const v = withIncomeConfirmed(recomputeView(base), 'e2');
    expect(v.categories[0].entries[0].status).toBe('pending');
    expect(v.categories[1].entries[0].status).toBeNull();
  });
});

describe('pocketProgress', () => {
  it('dentro del límite', () => {
    expect(pocketProgress({ limitCents: 15000, spentCents: 9200 })).toEqual({ pct: 61, over: false, restCents: 5800 });
  });
  it('pasada de límite: barra llena y resto negativo', () => {
    expect(pocketProgress({ limitCents: 10000, spentCents: 11200 })).toEqual({ pct: 100, over: true, restCents: -1200 });
  });
  it('límite 0 sin dividir por cero', () => {
    expect(pocketProgress({ limitCents: 0, spentCents: 0 })).toEqual({ pct: 100, over: false, restCents: 0 });
  });
});
