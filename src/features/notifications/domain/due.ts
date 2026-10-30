import { daysBetween, type IsoDate } from '@/lib/iso-date';
import type { YearMonth } from '@/lib/year-month';

export interface PaydayCandidate {
  entryId: string;
  recurringItemId: string;
  name: string;
  amountCents: number;
  yearMonth: YearMonth;
  paydayDate: IsoDate;
}

export interface DueReminder extends PaydayCandidate {
  kind: 'payday';
  attempt: 1 | 2;
  refKey: string;
}

/** Aviso el día de cobro (intento 1) y un único recordatorio al día siguiente (intento 2). */
export function duePaydayReminders(candidates: PaydayCandidate[], today: IsoDate): DueReminder[] {
  const due: DueReminder[] = [];
  for (const c of candidates) {
    const late = daysBetween(c.paydayDate, today);
    if (late !== 0 && late !== 1) continue;
    const attempt = late === 0 ? 1 : 2;
    due.push({ ...c, kind: 'payday', attempt, refKey: `payday:${c.recurringItemId}:${c.yearMonth}:${attempt}` });
  }
  return due;
}
