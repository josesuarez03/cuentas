import { describe, expect, it } from 'vitest';
import { recurringInputSchema } from './recurring-schema';

const ok = { name: 'Prime', kind: 'expense', categoryId: crypto.randomUUID(), accountId: crypto.randomUUID(), amountCents: 4990, frequency: 'annual', startMonth: '2026-10', anchorMonth: 3, installmentsTotal: null, paydayDay: null };

describe('recurringInputSchema', () => {
  it('acepta una anual con mes de cobro', () => expect(recurringInputSchema.safeParse(ok).success).toBe(true));
  it('pide el mes de una anual y las cuotas de un fraccionado', () => {
    const a = recurringInputSchema.safeParse({ ...ok, anchorMonth: null });
    expect(a.error!.issues[0]).toMatchObject({ path: ['anchorMonth'], message: 'Elige el mes en que se cobra.' });
    const b = recurringInputSchema.safeParse({ ...ok, frequency: 'installments', anchorMonth: null });
    expect(b.error!.issues[0]).toMatchObject({ path: ['installmentsTotal'], message: 'Indica el número de cuotas.' });
  });
  it('rechaza importe 0 y meses mal escritos', () => {
    expect(recurringInputSchema.safeParse({ ...ok, amountCents: 0 }).success).toBe(false);
    expect(recurringInputSchema.safeParse({ ...ok, startMonth: '2026-13' }).success).toBe(false);
  });
  it('la regla de cobro es «antes» por defecto y solo admite before/after', () => {
    expect(recurringInputSchema.parse({ ...ok, kind: 'income', paydayDay: 27 }).paydayRule).toBe('before');
    expect(recurringInputSchema.safeParse({ ...ok, paydayRule: 'never' }).success).toBe(false);
  });
});
