import { and, eq, sql } from 'drizzle-orm';
import * as s from '@/db/schema';
import type { Db } from '@/db/types';
import type { YearMonth } from '@/lib/year-month';
import { formatEuros } from '@/lib/money';
import { NotFoundError, openMonth } from './entries';

export interface NewPocketExpense { yearMonth: string; pocketId: string; amountCents: number; note: string | null }
export interface NewFundSpend { yearMonth: string; fundId: string; amountCents: number; note: string | null }

function assertPositive(amountCents: number) {
  if (!Number.isInteger(amountCents) || amountCents <= 0) throw new RangeError('Importe no válido');
}

export async function addPocketExpense(db: Db, userId: string, input: NewPocketExpense): Promise<void> {
  assertPositive(input.amountCents);
  const month = await openMonth(db, userId, input.yearMonth as YearMonth);
  const [row] = await db
    .select({ id: s.pockets.id })
    .from(s.monthPockets)
    .innerJoin(s.pockets, eq(s.pockets.id, s.monthPockets.pocketId))
    .where(and(eq(s.monthPockets.monthId, month.id), eq(s.monthPockets.pocketId, input.pocketId), eq(s.pockets.userId, userId)));
  if (!row) throw new NotFoundError('Bolsa no encontrada');
  await db.insert(s.pocketExpenses).values({
    pocketId: input.pocketId, monthId: month.id, amountCents: input.amountCents, note: input.note,
  });
}

export async function spendFromFund(db: Db, userId: string, input: NewFundSpend): Promise<void> {
  assertPositive(input.amountCents);
  const month = await openMonth(db, userId, input.yearMonth as YearMonth);
  const [fund] = await db
    .select({ id: s.funds.id })
    .from(s.funds)
    .where(and(eq(s.funds.id, input.fundId), eq(s.funds.userId, userId)));
  if (!fund) throw new NotFoundError('Hucha no encontrada');
  const [{ balance }] = await db
    .select({ balance: sql<number>`coalesce(sum(${s.fundMovements.amountCents}), 0)::int` })
    .from(s.fundMovements)
    .where(eq(s.fundMovements.fundId, fund.id));
  if (input.amountCents > balance) throw new RangeError(`La hucha solo tiene ${formatEuros(balance)}.`);
  await db.insert(s.fundMovements).values({
    fundId: fund.id, monthId: month.id, amountCents: -input.amountCents, note: input.note,
  });
}
