import { and, eq, inArray } from 'drizzle-orm';
import * as s from '@/db/schema';
import type { Db } from '@/db/types';
import type { YearMonth } from '@/lib/year-month';
import { findMonth } from './months';

export class NotFoundError extends Error {}
export class ClosedMonthError extends Error {}

function assertAmount(amountCents: number) {
  if (!Number.isInteger(amountCents) || amountCents < 0) throw new RangeError('Importe no válido');
}

export async function openMonth(db: Db, userId: string, ym: YearMonth) {
  const month = await findMonth(db, userId, ym);
  if (!month) throw new NotFoundError('Mes no encontrado');
  if (month.status === 'closed') throw new ClosedMonthError('El mes está cerrado');
  return month;
}

export async function updateEntryAmount(db: Db, userId: string, entryId: string, amountCents: number) {
  assertAmount(amountCents);
  const [row] = await db.select({ status: s.months.status })
    .from(s.entries).innerJoin(s.months, eq(s.entries.monthId, s.months.id))
    .where(and(eq(s.entries.id, entryId), eq(s.months.userId, userId)));
  if (!row) throw new NotFoundError('Partida no encontrada');
  if (row.status === 'closed') throw new ClosedMonthError('El mes está cerrado');
  await db.update(s.entries).set({ amountCents }).where(eq(s.entries.id, entryId));
}

export async function confirmIncome(db: Db, userId: string, entryId: string): Promise<void> {
  const [row] = await db.select({ kind: s.entries.kind, status: s.entries.status, monthStatus: s.months.status })
    .from(s.entries).innerJoin(s.months, eq(s.entries.monthId, s.months.id))
    .where(and(eq(s.entries.id, entryId), eq(s.months.userId, userId)));
  if (!row || row.kind !== 'income') throw new NotFoundError('Ingreso no encontrado');
  if (row.monthStatus === 'closed') throw new ClosedMonthError('El mes está cerrado');
  if (row.status === 'confirmed') return;
  await db.update(s.entries).set({ status: 'confirmed', confirmedAt: new Date() }).where(eq(s.entries.id, entryId));
}

export interface NewOneOffEntry {
  yearMonth: string;
  kind: 'income' | 'expense';
  name: string;
  categoryId: string;
  accountId: string;
  amountCents: number;
}

export async function addOneOffEntry(db: Db, userId: string, input: NewOneOffEntry): Promise<string> {
  assertAmount(input.amountCents);
  const month = await openMonth(db, userId, input.yearMonth);
  const [category] = await db.select({ id: s.categories.id }).from(s.categories)
    .where(and(eq(s.categories.id, input.categoryId), eq(s.categories.userId, userId)));
  const [account] = await db.select({ id: s.bankAccounts.id }).from(s.bankAccounts)
    .where(and(eq(s.bankAccounts.id, input.accountId), eq(s.bankAccounts.userId, userId)));
  if (!category || !account) throw new NotFoundError('Categoría o cuenta no encontrada');

  const [created] = await db.insert(s.entries).values({
    monthId: month.id,
    recurringItemId: null,
    kind: input.kind,
    name: input.name,
    categoryId: input.categoryId,
    accountId: input.accountId,
    amountCents: input.amountCents,
    status: input.kind === 'income' ? 'confirmed' : null,
    confirmedAt: input.kind === 'income' ? new Date() : null,
  }).returning({ id: s.entries.id });
  return created.id;
}

export async function setSavingsSplit(
  db: Db,
  userId: string,
  ym: YearMonth,
  split: { accountId: string; percent: number }[],
) {
  if (split.some((p) => !Number.isInteger(p.percent) || p.percent < 0 || p.percent > 100)) {
    throw new RangeError('Porcentaje no válido');
  }
  const parts = split.filter((p) => p.percent > 0);
  if (parts.reduce((acc, p) => acc + p.percent, 0) !== 100) throw new RangeError('El reparto debe sumar 100 %');

  const month = await openMonth(db, userId, ym);
  const owned = await db.select({ id: s.bankAccounts.id }).from(s.bankAccounts)
    .where(and(eq(s.bankAccounts.userId, userId), inArray(s.bankAccounts.id, parts.map((p) => p.accountId))));
  if (owned.length !== parts.length) throw new NotFoundError('Cuenta no encontrada');

  await db.transaction(async (tx) => {
    await tx.delete(s.monthSavingsSplit).where(eq(s.monthSavingsSplit.monthId, month.id));
    await tx.insert(s.monthSavingsSplit).values(parts.map((p) => ({ monthId: month.id, ...p })));
  });
}
