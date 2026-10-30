import { and, eq } from 'drizzle-orm';
import * as s from '@/db/schema';
import type { Db } from '@/db/types';
import { upcomingFor, type Upcoming } from '@/features/month/domain/upcoming';
import type { YearMonth } from '@/lib/year-month';
import { lastAmounts } from './months';

export async function getUpcoming(db: Db, userId: string, ym: YearMonth): Promise<Upcoming> {
  const items = await db.select().from(s.recurringItems)
    .where(and(eq(s.recurringItems.userId, userId), eq(s.recurringItems.active, true)));
  return upcomingFor(items, await lastAmounts(db, userId, ym), ym);
}
