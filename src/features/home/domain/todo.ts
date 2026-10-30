import type { MonthView } from '@/features/month/domain/month-view';
import type { WealthView } from '@/features/wealth/domain/types';
import { daysBetween, formatIsoWeekdayDay, type IsoDate } from '@/lib/iso-date';
import { formatEuros } from '@/lib/money';
import { formatMonthNameOnly, formatShortDate } from '@/lib/year-month';

export type TodoKind = 'income' | 'loan' | 'balance';

export interface TodoItem {
  key: string;
  kind: TodoKind;
  targetId: string;
  title: string;
  note: string;
  actionText: 'Confirmar' | 'Cobrado' | 'Actualizar';
  actionLabel: string;
  doneText: string | null;
}

/**
 * 5.8 en Inicio: solo lo que pide acción y no se ve en otro bloque.
 * Nómina: solo si cobra hoy, ya o en ≤ 3 días (sin día de cobro, siempre).
 * Bolsa pasada → tarjeta Bolsas; cargo próximo → «En [mes], además».
 */
export function todoItems(view: MonthView | null, wealth: WealthView | null, today: IsoDate): TodoItem[] {
  const incomes: TodoItem[] = view && view.status === 'open'
    ? view.categories
      .flatMap((c) => c.entries)
      .filter((e) => e.kind === 'income' && e.status === 'pending')
      .filter((e) => e.paydayDate == null || daysBetween(today, e.paydayDate) <= 3)
      .sort((a, b) => {
        if (a.paydayDate == null || b.paydayDate == null) return a.paydayDate == null ? (b.paydayDate == null ? 0 : 1) : -1;
        return a.paydayDate < b.paydayDate ? -1 : a.paydayDate > b.paydayDate ? 1 : 0;
      })
      .map((e) => ({
        key: `income:${e.id}`,
        kind: 'income',
        targetId: e.id,
        title: `${e.name} pendiente`,
        note: e.paydayDate
          ? `Cobro previsto el ${formatIsoWeekdayDay(e.paydayDate)} · ${formatEuros(e.amountCents, { sign: true })}`
          : `Previsto: ${formatEuros(e.amountCents, { sign: true })}`,
        actionText: 'Confirmar',
        actionLabel: `Confirmar ${e.name}`,
        doneText: null,
      }))
    : [];
  const loans: TodoItem[] = (wealth?.loans ?? []).map((l) => ({
    key: `loan:${l.id}`,
    kind: 'loan',
    targetId: l.id,
    title: `${l.person} te debe ${formatEuros(l.amountCents)}`,
    note: `Desde ${formatMonthNameOnly(l.lentYearMonth)}${l.note ? ` · ${l.note}` : ''}`,
    actionText: 'Cobrado',
    actionLabel: `Cobrado el préstamo de ${l.person}`,
    doneText: `Préstamo de ${l.person} cobrado.`,
  }));
  const balances: TodoItem[] = (wealth?.accounts ?? [])
    .filter((a) => a.stale && a.realDate)
    .map((a) => ({
      key: `balance:${a.accountId}`,
      kind: 'balance',
      targetId: a.accountId,
      title: `Actualiza el saldo de ${a.name}`,
      note: `Último saldo: ${formatShortDate(new Date(a.realDate!))}`,
      actionText: 'Actualizar',
      actionLabel: `Actualizar el saldo de ${a.name}`,
      doneText: null,
    }));
  return [...incomes, ...loans, ...balances];
}
