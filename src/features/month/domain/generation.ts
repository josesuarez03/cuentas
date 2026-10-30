import { diffMonths, monthOf, type YearMonth } from '@/lib/year-month';

export type Frequency = 'monthly' | 'bimonthly' | 'annual' | 'installments';
export type ItemKind = 'income' | 'expense';

export interface TemplateItem {
  id: string;
  name: string;
  kind: ItemKind;
  categoryId: string;
  accountId: string;
  amountCents: number;
  frequency: Frequency;
  startMonth: YearMonth;
  anchorMonth: number | null;
  installmentsTotal: number | null;
  active: boolean;
}

export interface Occurrence {
  occurs: boolean;
  installmentNumber: number | null;
}

const NO: Occurrence = { occurs: false, installmentNumber: null };
const YES: Occurrence = { occurs: true, installmentNumber: null };

export function occursIn(item: TemplateItem, ym: YearMonth): Occurrence {
  if (!item.active) return NO;
  const d = diffMonths(ym, item.startMonth);
  if (d < 0) return NO;
  switch (item.frequency) {
    case 'monthly':
      return YES;
    case 'bimonthly':
      return d % 2 === 0 ? YES : NO;
    case 'annual':
      return monthOf(ym) === item.anchorMonth ? YES : NO;
    case 'installments':
      return item.installmentsTotal !== null && d < item.installmentsTotal
        ? { occurs: true, installmentNumber: d + 1 }
        : NO;
  }
}

export interface GeneratedEntry {
  recurringItemId: string;
  kind: ItemKind;
  name: string;
  categoryId: string;
  accountId: string;
  amountCents: number;
  installmentNumber: number | null;
  status: 'pending' | null;
}

export function generateEntries(
  items: TemplateItem[],
  lastAmounts: ReadonlyMap<string, number>,
  ym: YearMonth,
): GeneratedEntry[] {
  return items.flatMap((item) => {
    const o = occursIn(item, ym);
    if (!o.occurs) return [];
    const amountCents = item.frequency === 'installments'
      ? item.amountCents
      : lastAmounts.get(item.id) ?? item.amountCents;
    return [{
      recurringItemId: item.id,
      kind: item.kind,
      name: item.name,
      categoryId: item.categoryId,
      accountId: item.accountId,
      amountCents,
      installmentNumber: o.installmentNumber,
      status: item.kind === 'income' ? 'pending' : null,
    }];
  });
}
