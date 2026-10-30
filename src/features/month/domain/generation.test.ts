import { describe, expect, it } from 'vitest';
import { generateEntries, occursIn, type TemplateItem } from './generation';

const item = (over: Partial<TemplateItem>): TemplateItem => ({
  id: 'i1', name: 'X', kind: 'expense', categoryId: 'c', accountId: 'a', amountCents: 1000,
  frequency: 'monthly', startMonth: '2026-10', anchorMonth: null, installmentsTotal: null, active: true,
  ...over,
});

describe('occursIn', () => {
  it('mensual: desde el mes de inicio', () => {
    expect(occursIn(item({}), '2026-09').occurs).toBe(false);
    expect(occursIn(item({}), '2026-10').occurs).toBe(true);
    expect(occursIn(item({}), '2027-05').occurs).toBe(true);
  });
  it('bimensual: cada 2 meses desde el inicio', () => {
    const gas = item({ frequency: 'bimonthly' });
    expect(occursIn(gas, '2026-10').occurs).toBe(true);
    expect(occursIn(gas, '2026-11').occurs).toBe(false);
    expect(occursIn(gas, '2026-12').occurs).toBe(true);
  });
  it('anual: solo en su mes de cobro', () => {
    const prime = item({ frequency: 'annual', anchorMonth: 3 });
    expect(occursIn(prime, '2027-03').occurs).toBe(true);
    expect(occursIn(prime, '2027-04').occurs).toBe(false);
  });
  it('fraccionado: numera cuotas y termina solo', () => {
    const portatil = item({ frequency: 'installments', installmentsTotal: 6 });
    expect(occursIn(portatil, '2026-11')).toEqual({ occurs: true, installmentNumber: 2 });
    expect(occursIn(portatil, '2027-03')).toEqual({ occurs: true, installmentNumber: 6 });
    expect(occursIn(portatil, '2027-04').occurs).toBe(false);
  });
  it('inactiva: nunca', () => {
    expect(occursIn(item({ active: false }), '2026-10').occurs).toBe(false);
  });
});

describe('generateEntries', () => {
  it('usa el último importe conocido o el de la plantilla', () => {
    const items = [
      item({ id: 'luz', name: 'Luz', amountCents: 4500 }),
      item({ id: 'alq', name: 'Alquiler', amountCents: 48000 }),
    ];
    const out = generateEntries(items, new Map([['luz', 5200]]), '2026-11');
    expect(out.map((e) => [e.name, e.amountCents])).toEqual([['Luz', 5200], ['Alquiler', 48000]]);
  });
  it('en fraccionados ignora el último importe', () => {
    const out = generateEntries([item({ id: 'p', frequency: 'installments', installmentsTotal: 6 })], new Map([['p', 1]]), '2026-11');
    expect(out[0]).toMatchObject({ amountCents: 1000, installmentNumber: 2 });
  });
  it('los ingresos nacen pendientes', () => {
    const out = generateEntries([item({ kind: 'income' })], new Map(), '2026-10');
    expect(out[0].status).toBe('pending');
  });
  it('omite lo que no toca este mes', () => {
    expect(generateEntries([item({ frequency: 'bimonthly' })], new Map(), '2026-11')).toEqual([]);
  });
});
