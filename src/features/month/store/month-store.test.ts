import { describe, expect, it } from 'vitest';
import { addMonths, currentYearMonth } from '@/lib/year-month';
import { useMonthStore } from './month-store';

describe('useMonthStore', () => {
  it('reset vuelve al mes actual', () => {
    useMonthStore.getState().shift(-2);
    expect(useMonthStore.getState().ym).toBe(addMonths(currentYearMonth(), -2));
    useMonthStore.getState().reset();
    expect(useMonthStore.getState().ym).toBe(currentYearMonth());
  });
});
