import { and, eq, isNull, lt } from 'drizzle-orm';
import * as s from '@/db/schema';
import type { Db } from '@/db/types';
import { currentYearMonth, type YearMonth } from '@/lib/year-month';
import { NotFoundError } from './entries';
import { ensureMonth, findMonth } from './months';

export async function rollMonth(db: Db, userId: string, current: YearMonth): Promise<{ created: boolean; closed: YearMonth[] }> {
  return db.transaction(async (tx) => {
    const existed = await findMonth(tx, userId, current);
    await ensureMonth(tx, userId, current);
    const rows = await tx.update(s.months).set({ status: 'closed' })
      .where(and(
        eq(s.months.userId, userId),
        lt(s.months.yearMonth, current),
        eq(s.months.status, 'open'),
        isNull(s.months.reopenedAt),
      ))
      .returning({ ym: s.months.yearMonth });
    return { created: !existed, closed: rows.map((r) => r.ym) };
  });
}

async function setStatus(
  db: Db,
  userId: string,
  ym: YearMonth,
  values: Partial<typeof s.months.$inferInsert>,
): Promise<void> {
  const rows = await db.update(s.months).set(values)
    .where(and(eq(s.months.userId, userId), eq(s.months.yearMonth, ym)))
    .returning({ id: s.months.id });
  if (rows.length === 0) throw new NotFoundError('Mes no encontrado');
}

export async function reopenMonth(db: Db, userId: string, ym: YearMonth, current: YearMonth = currentYearMonth()): Promise<void> {
  if (ym >= current) throw new RangeError('Solo se pueden reabrir meses pasados.');
  await setStatus(db, userId, ym, { status: 'open', reopenedAt: new Date() });
}

export async function closeMonth(db: Db, userId: string, ym: YearMonth, current: YearMonth = currentYearMonth()): Promise<void> {
  if (ym >= current) throw new RangeError('El mes actual se cierra solo al empezar el siguiente.');
  await setStatus(db, userId, ym, { status: 'closed' });
}
