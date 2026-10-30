import type { MonthView } from '@/features/month/domain/month-view';
import { formatMonthName } from '@/lib/year-month';

export type ConfirmTarget =
  | { kind: 'open'; entry: { id: string; name: string; amountCents: number } }
  | { kind: 'message'; text: string };

export function confirmTarget(view: MonthView, entryId: string): ConfirmTarget {
  const monthName = formatMonthName(view.yearMonth);
  const entry = view.categories.flatMap((c) => c.entries).find((e) => e.id === entryId && e.kind === 'income');
  if (!entry) return { kind: 'message', text: `No encuentro ese ingreso en ${monthName}.` };
  if (entry.status === 'confirmed') return { kind: 'message', text: `${entry.name} ya está confirmada.` };
  if (view.status === 'closed') return { kind: 'message', text: `${monthName} está cerrado. Reábrelo para confirmar.` };
  return { kind: 'open', entry: { id: entry.id, name: entry.name, amountCents: entry.amountCents } };
}
