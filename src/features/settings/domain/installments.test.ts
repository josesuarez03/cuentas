import { describe, expect, it } from 'vitest';
import { installmentProgress } from './installments';

const portatil = { frequency: 'installments' as const, startMonth: '2026-10', installmentsTotal: 6 };

describe('installmentProgress', () => {
  it('cuota del mes y las que faltan después', () => {
    expect(installmentProgress(portatil, '2026-10')).toEqual({ current: 1, remaining: 5 });
    expect(installmentProgress(portatil, '2026-12')).toEqual({ current: 3, remaining: 3 });
    expect(installmentProgress(portatil, '2027-03')).toEqual({ current: 6, remaining: 0 });
    expect(installmentProgress(portatil, '2027-04')).toEqual({ current: null, remaining: 0 });
    expect(installmentProgress(portatil, '2026-09')).toEqual({ current: null, remaining: 6 });
  });
  it('no aplica a otras frecuencias', () => {
    expect(installmentProgress({ frequency: 'monthly', startMonth: '2026-10', installmentsTotal: null }, '2026-12')).toEqual({ current: null, remaining: null });
  });
});
