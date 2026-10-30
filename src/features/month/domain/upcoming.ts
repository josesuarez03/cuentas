import type { YearMonth } from '@/lib/year-month';
import { generateEntries, type TemplateItem } from './generation';

export interface UpcomingItem { id: string; name: string; note: string; signedCents: number }
export interface Upcoming { yearMonth: YearMonth; items: UpcomingItem[]; totalCents: number }

const NOTE = { bimonthly: 'cada 2 meses', annual: 'anual' } as const;

/** Partidas no mensuales que tocan `ym`, con el mismo importe que tendría la generación (5.1). */
export function upcomingFor(
  items: TemplateItem[],
  lastAmounts: ReadonlyMap<string, number>,
  ym: YearMonth,
): Upcoming {
  const byId = new Map(items.map((i) => [i.id, i]));
  const rows = generateEntries(items.filter((i) => i.frequency !== 'monthly'), lastAmounts, ym)
    .map((g): UpcomingItem => {
      const source = byId.get(g.recurringItemId)!;
      const note = source.frequency === 'installments'
        ? `cuota ${g.installmentNumber} de ${source.installmentsTotal}`
        : NOTE[source.frequency as 'bimonthly' | 'annual'];
      return { id: g.recurringItemId, name: g.name, note, signedCents: g.kind === 'income' ? g.amountCents : -g.amountCents };
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  return { yearMonth: ym, items: rows, totalCents: rows.reduce((acc, r) => acc + r.signedCents, 0) };
}
