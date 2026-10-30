import { formatEuros } from '@/lib/money';
import { formatMonthNameOnly } from '@/lib/year-month';
import type { WealthPoint } from './types';

export interface ChartPoint { yearMonth: string; label: string; euros: number; text: string }

export function chartPoints(history: WealthPoint[]): ChartPoint[] {
  return history.map((p) => ({
    yearMonth: p.yearMonth,
    label: formatMonthNameOnly(p.yearMonth).slice(0, 3),
    euros: p.totalCents / 100,
    text: formatEuros(p.totalCents),
  }));
}
