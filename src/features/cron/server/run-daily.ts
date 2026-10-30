import { sql } from 'drizzle-orm';
import * as s from '@/db/schema';
import type { Db } from '@/db/types';
import { isAllowedEmail } from '@/features/auth/allowlist';
import { rollMonth } from '@/features/month/server/lifecycle';
import { getUserCalendar } from '@/features/month/server/payday';
import { notifyUser, type Senders } from '@/features/notifications/server/notify';
import { todayIso } from '@/lib/iso-date';
import { currentYearMonth } from '@/lib/year-month';

export interface DailySummary {
  users: number;
  monthsCreated: number;
  monthsClosed: number;
  sent: number;
  failed: number;
  errors: number;
}

export async function runDaily(db: Db, now: Date, deps: { baseUrl: string; senders: Senders }): Promise<DailySummary> {
  const rows = await db.select({ id: s.user.id, email: s.user.email }).from(s.user)
    .where(sql`exists (select 1 from ${s.bankAccounts} where ${s.bankAccounts.userId} = ${s.user.id})`);
  const users = rows.filter((u) => isAllowedEmail(u.email));
  const summary: DailySummary = { users: users.length, monthsCreated: 0, monthsClosed: 0, sent: 0, failed: 0, errors: 0 };
  for (const u of users) {
    try {
      const cal = await getUserCalendar(db, u.id);
      const ym = currentYearMonth(now, cal.timezone);
      const today = todayIso(now, cal.timezone);
      const roll = await rollMonth(db, u.id, ym);
      const n = await notifyUser(db, u, today, ym, { region: cal.holidayRegion, ...deps });
      summary.monthsCreated += roll.created ? 1 : 0;
      summary.monthsClosed += roll.closed.length;
      summary.sent += n.sent;
      summary.failed += n.failed;
    } catch (error) {
      console.error('cron diario', u.id, error);
      summary.errors++;
    }
  }
  return summary;
}
