import { and, eq, inArray, sql } from 'drizzle-orm';
import * as s from '@/db/schema';
import type { Db } from '@/db/types';
import { currentYearMonth, type YearMonth } from '@/lib/year-month';
import type { AccountType } from '@/features/wealth/domain/types';
import { NotFoundError, setSavingsSplit } from '@/features/month/server/entries';
import { findMonth } from '@/features/month/server/months';
import { SAVINGS_TARGET } from '../domain/types';

export async function createAccount(
  db: Db,
  userId: string,
  input: { name: string; bank: string; type: AccountType; balanceCents: number | null },
): Promise<string> {
  return db.transaction(async (tx) => {
    const [account] = await tx.insert(s.bankAccounts)
      .values({ userId, name: input.name, bank: input.bank, type: input.type })
      .returning({ id: s.bankAccounts.id });
    if (input.balanceCents !== null) {
      await tx.insert(s.balanceSnapshots).values({ accountId: account.id, balanceCents: input.balanceCents });
    }
    return account.id;
  });
}

export async function updateAccount(
  db: Db,
  userId: string,
  id: string,
  input: { name: string; bank: string; type: AccountType },
): Promise<void> {
  const rows = await db.update(s.bankAccounts)
    .set({
      name: input.name, bank: input.bank, type: input.type,
      ...(SAVINGS_TARGET(input.type) ? {} : { defaultSavingsPercent: 0 }),
    })
    .where(and(eq(s.bankAccounts.id, id), eq(s.bankAccounts.userId, userId)))
    .returning({ id: s.bankAccounts.id });
  if (rows.length === 0) throw new NotFoundError('Cuenta no encontrada');
}

export async function createCategory(
  db: Db,
  userId: string,
  input: { name: string; kind: 'income' | 'expense'; parentId: string | null },
): Promise<string> {
  if (input.parentId) {
    const [parent] = await db.select({ parentId: s.categories.parentId, kind: s.categories.kind }).from(s.categories)
      .where(and(eq(s.categories.id, input.parentId), eq(s.categories.userId, userId)));
    if (!parent) throw new NotFoundError('Categoría no encontrada');
    if (parent.parentId) throw new RangeError('Solo hay un nivel de subcategorías.');
    if (parent.kind !== input.kind) throw new RangeError('La subcategoría debe ser del mismo tipo.');
  }
  const [last] = await db.select({ max: sql<number>`coalesce(max(${s.categories.sortOrder}), -1)`.mapWith(Number) })
    .from(s.categories).where(eq(s.categories.userId, userId));
  const [created] = await db.insert(s.categories)
    .values({ userId, name: input.name, kind: input.kind, parentId: input.parentId, sortOrder: last.max + 1 })
    .returning({ id: s.categories.id });
  return created.id;
}

export async function renameCategory(db: Db, userId: string, id: string, name: string): Promise<void> {
  const rows = await db.update(s.categories).set({ name })
    .where(and(eq(s.categories.id, id), eq(s.categories.userId, userId)))
    .returning({ id: s.categories.id });
  if (rows.length === 0) throw new NotFoundError('Categoría no encontrada');
}

export async function setDefaultSplit(
  db: Db,
  userId: string,
  split: { accountId: string; percent: number }[],
  ym: YearMonth = currentYearMonth(),
): Promise<void> {
  if (split.some((p) => !Number.isInteger(p.percent) || p.percent < 0 || p.percent > 100)) {
    throw new RangeError('Porcentaje no válido');
  }
  const parts = split.filter((p) => p.percent > 0);
  if (new Set(parts.map((p) => p.accountId)).size !== parts.length) throw new RangeError('Reparto no válido');
  if (parts.reduce((acc, p) => acc + p.percent, 0) !== 100) throw new RangeError('El reparto debe sumar 100 %');

  const owned = await db.select({ id: s.bankAccounts.id, type: s.bankAccounts.type }).from(s.bankAccounts)
    .where(and(eq(s.bankAccounts.userId, userId), inArray(s.bankAccounts.id, parts.map((p) => p.accountId))));
  if (owned.length !== new Set(parts.map((p) => p.accountId)).size) throw new NotFoundError('Cuenta no encontrada');
  if (owned.some((a) => !SAVINGS_TARGET(a.type))) throw new RangeError('Esa cuenta no puede recibir ahorro.');

  await db.transaction(async (tx) => {
    await tx.update(s.bankAccounts).set({ defaultSavingsPercent: 0 }).where(eq(s.bankAccounts.userId, userId));
    for (const p of parts) {
      await tx.update(s.bankAccounts).set({ defaultSavingsPercent: p.percent })
        .where(and(eq(s.bankAccounts.id, p.accountId), eq(s.bankAccounts.userId, userId)));
    }
    const month = await findMonth(tx, userId, ym);
    if (month && month.status === 'open') await setSavingsSplit(tx, userId, ym, parts);
  });
}
