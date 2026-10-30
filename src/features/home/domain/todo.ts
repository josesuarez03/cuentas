import type { MonthView } from '@/features/month/domain/month-view';
import { formatEuros } from '@/lib/money';

export interface TodoItem { entryId: string; title: string; note: string; actionLabel: string }

/** «Por hacer» (5.8), plan 2a: solo ingresos pendientes del mes abierto. Sin día de cobro todavía. */
export function todoItems(view: MonthView): TodoItem[] {
  if (view.status !== 'open') return [];
  return view.categories
    .flatMap((c) => c.entries)
    .filter((e) => e.kind === 'income' && e.status === 'pending')
    .map((e) => ({
      entryId: e.id,
      title: `${e.name} pendiente`,
      note: `Previsto: ${formatEuros(e.amountCents, { sign: true })}`,
      actionLabel: `Confirmar ${e.name}`,
    }));
}
