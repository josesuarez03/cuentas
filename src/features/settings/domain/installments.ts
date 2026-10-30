import { diffMonths, type YearMonth } from '@/lib/year-month';
import type { Frequency } from './types';

export function installmentProgress(
  item: { frequency: Frequency; startMonth: string; installmentsTotal: number | null },
  ym: YearMonth,
): { current: number | null; remaining: number | null } {
  const total = item.installmentsTotal;
  if (item.frequency !== 'installments' || total === null) return { current: null, remaining: null };
  const pos = diffMonths(ym, item.startMonth) + 1;
  return {
    current: pos >= 1 && pos <= total ? pos : null,
    remaining: Math.min(total, Math.max(0, total - Math.max(pos, 0))),
  };
}
