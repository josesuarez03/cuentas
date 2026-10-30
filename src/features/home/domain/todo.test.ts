import { describe, expect, it } from 'vitest';
import { recomputeView, type MonthViewBase } from '@/features/month/domain/month-view';
import type { WealthView } from '@/features/wealth/domain/types';
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

const wealth: WealthView = {
  accounts: [
    { accountId: 'p', name: 'BBVA principal', type: 'checking', realCents: 1, realDate: '2026-09-12T10:00:00.000Z', estimatedCents: 1, diffCents: 0, stale: true },
    { accountId: 't', name: 'Trade', type: 'investment', realCents: 1, realDate: '2026-10-20T10:00:00.000Z', estimatedCents: 1, diffCents: 0, stale: false },
  ],
  totalCents: 2, variationCents: null, previousYearMonth: '2026-09',
  loans: [{ id: 'l1', person: 'Juan', amountCents: 20000, lentYearMonth: '2026-09', note: 'Cena' }],
  history: [],
};

describe('todoItems', () => {
  it('nómina, préstamos y saldos sin actualizar, en ese orden y con su acción', () => {
    expect(todoItems(recomputeView(base), wealth)).toEqual([
      { key: 'income:e1', kind: 'income', targetId: 'e1', title: 'Nómina pendiente', note: 'Previsto: +1.870,00 €', actionText: 'Confirmar', actionLabel: 'Confirmar Nómina', doneText: 'Nómina confirmada.' },
      { key: 'loan:l1', kind: 'loan', targetId: 'l1', title: 'Juan te debe 200,00 €', note: 'Desde septiembre · Cena', actionText: 'Cobrado', actionLabel: 'Cobrado el préstamo de Juan', doneText: 'Préstamo de Juan cobrado.' },
      { key: 'balance:p', kind: 'balance', targetId: 'p', title: 'Actualiza el saldo de BBVA principal', note: 'Último saldo: 12 sept', actionText: 'Actualizar', actionLabel: 'Actualizar el saldo de BBVA principal', doneText: null },
    ]);
  });
  it('mes cerrado: sin nómina, pero préstamos y saldos siguen', () => {
    expect(todoItems(recomputeView({ ...base, status: 'closed' }), wealth).map((t) => t.kind)).toEqual(['loan', 'balance']);
  });
  it('no repite lo que se ve en otro bloque: bolsas pasadas no aparecen', () => {
    const over = recomputeView({ ...base, pockets: [{ id: 'b', name: 'Ocio', limitCents: 100, spentCents: 500 }] });
    expect(todoItems(over, null).map((t) => t.kind)).toEqual(['income']);
  });
});
