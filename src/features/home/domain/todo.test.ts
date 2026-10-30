import { describe, expect, it } from 'vitest';
import { recomputeView, type MonthViewBase } from '@/features/month/domain/month-view';
import { todoItems } from './todo';

const base: MonthViewBase = {
  yearMonth: '2026-10',
  status: 'open',
  categories: [
    { id: 'ing', name: 'Ingresos', totalCents: 0, entries: [
      { id: 'e1', kind: 'income', name: 'Nómina', note: 'Pendiente · Mensual · BBVA principal', amountCents: 187000, status: 'pending' },
      { id: 'e2', kind: 'income', name: 'Bizum', note: 'Puntual · BBVA principal', amountCents: 2000, status: 'confirmed' },
    ] },
    { id: 'piso', name: 'Piso', totalCents: 0, entries: [
      { id: 'e3', kind: 'expense', name: 'Alquiler', note: 'Mensual · BBVA principal', amountCents: 48000, status: null },
    ] },
  ],
  pockets: [],
  funds: [],
  split: [],
};

describe('todoItems', () => {
  it('solo los ingresos pendientes, con su acción', () => {
    expect(todoItems(recomputeView(base))).toEqual([
      { entryId: 'e1', title: 'Nómina pendiente', note: 'Previsto: +1.870,00 €', actionLabel: 'Confirmar Nómina' },
    ]);
  });
  it('nada que hacer en un mes cerrado', () => {
    expect(todoItems(recomputeView({ ...base, status: 'closed' }))).toEqual([]);
  });
});
