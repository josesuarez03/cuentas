import { and, eq } from 'drizzle-orm';
import * as s from '@/db/schema';
import type { Db } from '@/db/types';
import { NotFoundError } from '@/features/month/server/entries';
import { findMonth } from '@/features/month/server/months';
import { currentYearMonth, type YearMonth } from '@/lib/year-month';
import type { RecurringInput } from '../domain/recurring-schema';

export interface PocketInput { name: string; accountId: string; monthlyLimitCents: number }
export interface FundInput { name: string; accountId: string; monthlyAllocationCents: number }

async function assertAccount(db: Db, userId: string, accountId: string) {
  const [row] = await db.select({ id: s.bankAccounts.id }).from(s.bankAccounts)
    .where(and(eq(s.bankAccounts.id, accountId), eq(s.bankAccounts.userId, userId))).limit(1);
  if (!row) throw new NotFoundError('Cuenta no encontrada');
}

async function assertRefs(db: Db, userId: string, kind: 'income' | 'expense', categoryId: string, accountId: string) {
  const [category] = await db.select({ kind: s.categories.kind }).from(s.categories)
    .where(and(eq(s.categories.id, categoryId), eq(s.categories.userId, userId))).limit(1);
  if (!category) throw new NotFoundError('Categoría no encontrada');
  if (category.kind !== kind) {
    throw new RangeError(kind === 'income' ? 'La categoría debe ser de ingreso.' : 'La categoría debe ser de gasto.');
  }
  await assertAccount(db, userId, accountId);
}

function normalize(input: RecurringInput) {
  return {
    name: input.name,
    kind: input.kind,
    categoryId: input.categoryId,
    accountId: input.accountId,
    amountCents: input.amountCents,
    frequency: input.frequency,
    startMonth: input.startMonth,
    anchorMonth: input.frequency === 'annual' ? input.anchorMonth : null,
    installmentsTotal: input.frequency === 'installments' ? input.installmentsTotal : null,
    paydayDay: input.kind === 'income' ? input.paydayDay : null,
  };
}

async function openMonthOrNull(db: Db, userId: string, ym: YearMonth) {
  const month = await findMonth(db, userId, ym);
  return month && month.status === 'open' ? month : null;
}

export async function createRecurring(db: Db, userId: string, input: RecurringInput): Promise<string> {
  await assertRefs(db, userId, input.kind, input.categoryId, input.accountId);
  const [row] = await db.insert(s.recurringItems).values({ userId, ...normalize(input) }).returning({ id: s.recurringItems.id });
  return row.id;
}

export async function updateRecurring(
  db: Db, userId: string, id: string, input: RecurringInput, ym: YearMonth = currentYearMonth(),
): Promise<void> {
  await assertRefs(db, userId, input.kind, input.categoryId, input.accountId);
  await db.transaction(async (tx) => {
    const [row] = await tx.update(s.recurringItems).set(normalize(input))
      .where(and(eq(s.recurringItems.id, id), eq(s.recurringItems.userId, userId)))
      .returning({ id: s.recurringItems.id });
    if (!row) throw new NotFoundError('Partida no encontrada');
    const month = await openMonthOrNull(tx, userId, ym);
    if (month) {
      await tx.update(s.entries).set({ amountCents: input.amountCents })
        .where(and(eq(s.entries.monthId, month.id), eq(s.entries.recurringItemId, id)));
    }
  });
}

export async function setRecurringActive(db: Db, userId: string, id: string, active: boolean): Promise<void> {
  const [row] = await db.update(s.recurringItems).set({ active })
    .where(and(eq(s.recurringItems.id, id), eq(s.recurringItems.userId, userId)))
    .returning({ id: s.recurringItems.id });
  if (!row) throw new NotFoundError('Partida no encontrada');
}

export async function createPocket(
  db: Db, userId: string, input: PocketInput, ym: YearMonth = currentYearMonth(),
): Promise<string> {
  await assertAccount(db, userId, input.accountId);
  const [row] = await db.insert(s.pockets).values({ userId, ...input }).returning({ id: s.pockets.id });
  const month = await openMonthOrNull(db, userId, ym);
  if (month) {
    await db.insert(s.monthPockets).values({ monthId: month.id, pocketId: row.id, limitCents: input.monthlyLimitCents });
  }
  return row.id;
}

export async function updatePocket(
  db: Db, userId: string, id: string, input: PocketInput, ym: YearMonth = currentYearMonth(),
): Promise<void> {
  await assertAccount(db, userId, input.accountId);
  await db.transaction(async (tx) => {
    const [row] = await tx.update(s.pockets).set(input)
      .where(and(eq(s.pockets.id, id), eq(s.pockets.userId, userId)))
      .returning({ id: s.pockets.id });
    if (!row) throw new NotFoundError('Bolsa no encontrada');
    const month = await openMonthOrNull(tx, userId, ym);
    if (month) {
      await tx.insert(s.monthPockets).values({ monthId: month.id, pocketId: id, limitCents: input.monthlyLimitCents })
        .onConflictDoUpdate({ target: [s.monthPockets.monthId, s.monthPockets.pocketId], set: { limitCents: input.monthlyLimitCents } });
    }
  });
}

export async function createFund(db: Db, userId: string, input: FundInput): Promise<string> {
  await assertAccount(db, userId, input.accountId);
  const [row] = await db.insert(s.funds).values({ userId, ...input }).returning({ id: s.funds.id });
  return row.id;
}

export async function updateFund(db: Db, userId: string, id: string, input: FundInput): Promise<void> {
  await assertAccount(db, userId, input.accountId);
  const [row] = await db.update(s.funds).set(input)
    .where(and(eq(s.funds.id, id), eq(s.funds.userId, userId)))
    .returning({ id: s.funds.id });
  if (!row) throw new NotFoundError('Hucha no encontrada');
}
