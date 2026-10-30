import { describe, expect, it } from 'vitest';
import { recomputeView, type MonthViewBase } from './month-view';
import { confirmTarget } from './confirm-target';

const base: MonthViewBase = {
  yearMonth: '2026-10', status: 'open', pockets: [], funds: [], split: [],
  categories: [{ id: 'ing', name: 'Ingresos', totalCents: 0, entries: [
    { id: 'e1', kind: 'income', name: 'Nómina', note: '', amountCents: 187000, status: 'pending' },
    { id: 'e2', kind: 'income', name: 'Bizum', note: '', amountCents: 2000, status: 'confirmed' },
    { id: 'e3', kind: 'expense', name: 'Alquiler', note: '', amountCents: 48000, status: null },
  ] }],
};

describe('confirmTarget', () => {
  it('ingreso pendiente de un mes abierto: abre el diálogo', () => {
    expect(confirmTarget(recomputeView(base), 'e1')).toEqual({ kind: 'open', entry: { id: 'e1', name: 'Nómina', amountCents: 187000 } });
  });
  it('ya confirmada', () => {
    expect(confirmTarget(recomputeView(base), 'e2')).toEqual({ kind: 'message', text: 'Bizum ya está confirmada.' });
  });
  it('no existe o no es un ingreso', () => {
    for (const id of ['nope', 'e3']) {
      expect(confirmTarget(recomputeView(base), id)).toEqual({ kind: 'message', text: 'No encuentro ese ingreso en Octubre 2026.' });
    }
  });
  it('mes cerrado', () => {
    expect(confirmTarget(recomputeView({ ...base, status: 'closed' }), 'e1')).toEqual({ kind: 'message', text: 'Octubre 2026 está cerrado. Reábrelo para confirmar.' });
  });
});
