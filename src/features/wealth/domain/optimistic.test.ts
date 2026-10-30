import { describe, expect, it } from 'vitest';
import type { WealthView } from './types';
import { withSnapshot } from './optimistic';

const view: WealthView = {
  accounts: [
    { accountId: 'p', name: 'BBVA principal', type: 'checking', realCents: 100000, realDate: '2026-09-01T00:00:00.000Z', estimatedCents: 120000, diffCents: 20000, stale: true },
    { accountId: 't', name: 'Tarjeta', type: 'credit_card', realCents: -40000, realDate: '2026-10-20T00:00:00.000Z', estimatedCents: -40000, diffCents: 0, stale: false },
  ],
  totalCents: 80000, variationCents: 5000, previousYearMonth: '2026-09', loans: [], history: [],
};

describe('withSnapshot', () => {
  it('el saldo nuevo es real y estimado a la vez, y el total y la variación se mueven lo mismo', () => {
    const v = withSnapshot(view, 'p', 110000, new Date('2026-10-30T12:00:00Z'));
    expect(v.accounts[0]).toMatchObject({ realCents: 110000, estimatedCents: 110000, diffCents: 0, stale: false, realDate: '2026-10-30T12:00:00.000Z' });
    expect(v.totalCents).toBe(70000);
    expect(v.variationCents).toBe(-5000);
  });
  it('variación null se queda null', () => {
    expect(withSnapshot({ ...view, variationCents: null }, 'p', 1, new Date()).variationCents).toBeNull();
  });
});
