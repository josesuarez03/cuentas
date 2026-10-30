import { computeMonth, type EntryKind, type MonthCalc } from './month-calc';

export interface EntryView {
  id: string;
  kind: EntryKind;
  name: string;
  note: string;
  amountCents: number;
  status: 'pending' | 'confirmed' | null;
}

export interface CategoryGroup {
  id: string;
  name: string;
  totalCents: number;
  entries: EntryView[];
}

export interface PocketView { id: string; name: string; limitCents: number; spentCents: number }
export interface FundView { id: string; name: string; allocatedCents: number; balanceCents: number }
export interface SplitView { accountId: string; accountName: string; percent: number; cents: number }

export interface MonthViewBase {
  yearMonth: string;
  status: 'open' | 'closed';
  categories: CategoryGroup[];
  pockets: PocketView[];
  funds: FundView[];
  split: SplitView[];
}

export interface MonthView extends MonthViewBase {
  calc: MonthCalc;
}

export function signOf(kind: EntryKind): 1 | -1 {
  return kind === 'income' || kind === 'loan_repayment' ? 1 : -1;
}

export function recomputeView(base: MonthViewBase): MonthView {
  const categories = base.categories.map((c) => ({
    ...c,
    totalCents: c.entries.reduce((acc, e) => acc + signOf(e.kind) * e.amountCents, 0),
  }));
  const calc = computeMonth({
    status: base.status,
    entries: categories.flatMap((c) => c.entries),
    fundAllocationsCents: base.funds.reduce((acc, f) => acc + f.allocatedCents, 0),
    pockets: base.pockets,
    split: base.split,
  });
  const split = base.split.map((s) => ({
    ...s,
    cents: calc.savings.find((x) => x.accountId === s.accountId)?.cents ?? 0,
  }));
  return { ...base, categories, split, calc };
}

export function withEntryAmount(view: MonthView, entryId: string, amountCents: number): MonthView {
  return recomputeView({
    ...view,
    categories: view.categories.map((c) => ({
      ...c,
      entries: c.entries.map((e) => (e.id === entryId ? { ...e, amountCents } : e)),
    })),
  });
}
