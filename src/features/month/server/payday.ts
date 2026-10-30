import { and, eq, isNotNull } from 'drizzle-orm';
import * as s from '@/db/schema';
import type { Db } from '@/db/types';
import type { IsoDate } from '@/lib/iso-date';
import { paydayDate } from '@/lib/payday';
import type { YearMonth } from '@/lib/year-month';

const DEFAULT_CALENDAR = { timezone: 'Europe/Madrid', holidayRegion: 'ES-MD' };

export async function getUserCalendar(db: Db, userId: string): Promise<{ timezone: string; holidayRegion: string }> {
  const [row] = await db.select({ timezone: s.userSettings.timezone, holidayRegion: s.userSettings.holidayRegion })
    .from(s.userSettings).where(eq(s.userSettings.userId, userId)).limit(1);
  return row ?? { ...DEFAULT_CALENDAR };
}

export interface PendingPayday {
  entryId: string;
  recurringItemId: string;
  name: string;
  amountCents: number;
  yearMonth: YearMonth;
  paydayDate: IsoDate;
}

export async function pendingPaydays(db: Db, userId: string, ym: YearMonth, region: string, opts: { includeClosed?: boolean } = {}): Promise<PendingPayday[]> {
  const rows = await db.select({
    entryId: s.entries.id,
    recurringItemId: s.recurringItems.id,
    name: s.entries.name,
    amountCents: s.entries.amountCents,
    paydayDay: s.recurringItems.paydayDay,
    paydayRule: s.recurringItems.paydayRule,
  })
    .from(s.entries)
    .innerJoin(s.months, eq(s.entries.monthId, s.months.id))
    .innerJoin(s.recurringItems, eq(s.entries.recurringItemId, s.recurringItems.id))
    .where(and(
      eq(s.months.userId, userId),
      eq(s.months.yearMonth, ym),
      ...(opts.includeClosed ? [] : [eq(s.months.status, 'open')]),
      eq(s.entries.kind, 'income'),
      eq(s.entries.status, 'pending'),
      isNotNull(s.recurringItems.paydayDay),
    ));
  return rows
    .map((r) => ({
      entryId: r.entryId,
      recurringItemId: r.recurringItemId,
      name: r.name,
      amountCents: r.amountCents,
      yearMonth: ym,
      paydayDate: paydayDate(ym, r.paydayDay as number, r.paydayRule, region),
    }))
    .sort((a, b) => a.paydayDate.localeCompare(b.paydayDate));
}
