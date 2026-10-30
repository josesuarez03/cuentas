import type { IsoDate } from '@/lib/iso-date';
import { computeMonth, type EntryKind, type MonthCalc } from './month-calc';

export interface EntryView {
  id: string;
  kind: EntryKind;
  name: string;
  note: string;
  amountCents: number;
  status: 'pending' | 'confirmed' | null;
  paydayDate?: IsoDate | null;
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

export function withPocketExpense(view: MonthView, pocketId: string, amountCents: number): MonthView {
  return recomputeView({ ...view, pockets: view.pockets.map((p) => (p.id === pocketId ? { ...p, spentCents: p.spentCents + amountCents } : p)) });
}

/** 5.4: el gasto de una hucha no cuenta en Gastos; solo baja su saldo. */
export function withFundSpend(view: MonthView, fundId: string, amountCents: number): MonthView {
  return { ...view, funds: view.funds.map((f) => (f.id === fundId ? { ...f, balanceCents: f.balanceCents - amountCents } : f)) };
}

export function isMonthEmpty(view: MonthViewBase): boolean {
  return view.categories.length === 0 && view.pockets.length === 0 && view.funds.length === 0;
}

/** Optimista: el disponible no cambia (los pendientes ya cuentan como ingreso, 5.4). */
export function withIncomeConfirmed(view: MonthView, entryId: string): MonthView {
  return {
    ...view,
    categories: view.categories.map((c) => ({
      ...c,
      entries: c.entries.map((e) => (e.id === entryId && e.status === 'pending'
        ? { ...e, status: 'confirmed' as const, note: e.note.replace(/^Pendiente · /, '') }
        : e)),
    })),
  };
}

export interface PocketProgress { pct: number; over: boolean; restCents: number }

export function pocketProgress(p: { limitCents: number; spentCents: number }): PocketProgress {
  return {
    pct: p.limitCents > 0 ? Math.min(100, Math.round((p.spentCents * 100) / p.limitCents)) : 100,
    over: p.spentCents > p.limitCents,
    restCents: p.limitCents - p.spentCents,
  };
}
