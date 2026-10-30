import { describe, expect, it } from 'vitest';
import type { AccountBalance } from '@/features/wealth/domain/types';
import { wealthBar } from './wealth-bar';

const acc = (accountId: string, cents: number | null, type: AccountBalance['type'] = 'checking'): AccountBalance =>
  ({ accountId, name: accountId, type, realCents: cents, realDate: null, estimatedCents: cents, diffCents: 0, stale: false });

describe('wealthBar', () => {
  it('segmentos de las cuentas en positivo que suman 100 y leyenda con todas las que tienen saldo', () => {
    const r = wealthBar([acc('a', 100000), acc('b', 50000), acc('c', 50000), acc('t', -40000, 'credit_card'), acc('n', null)]);
    expect(r.segments).toEqual([
      { accountId: 'a', pct: 50, color: 'bg-serie-1' },
      { accountId: 'b', pct: 25, color: 'bg-serie-2' },
      { accountId: 'c', pct: 25, color: 'bg-serie-3' },
    ]);
    expect(r.legend.map((l) => [l.accountId, l.cents, l.color])).toEqual([
      ['a', 100000, 'bg-serie-1'], ['b', 50000, 'bg-serie-2'], ['c', 50000, 'bg-serie-3'], ['t', -40000, null],
    ]);
  });
  it('el redondeo siempre suma 100', () => {
    const r = wealthBar([acc('a', 1), acc('b', 1), acc('c', 1)]);
    expect(r.segments.reduce((s, x) => s + x.pct, 0)).toBe(100);
  });
  it('más de 5 cuentas repiten serie; sin positivas no hay segmentos', () => {
    expect(wealthBar(['a', 'b', 'c', 'd', 'e', 'f'].map((id) => acc(id, 1))).segments[5].color).toBe('bg-serie-1');
    expect(wealthBar([acc('t', -1, 'credit_card')]).segments).toEqual([]);
  });
});
