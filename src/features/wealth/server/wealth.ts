import { and, asc, eq, isNull, lt } from 'drizzle-orm';
import * as s from '@/db/schema';
import type { Db } from '@/db/types';
import { NotFoundError } from '@/features/month/server/entries';
import { buildWealth, flowOfEntry, type Flow } from '@/features/wealth/domain/estimate';
import type { WealthView } from '@/features/wealth/domain/types';

const MAX_BALANCE_CENTS = 100_000_000;

export async function addBalanceSnapshot(
  db: Db,
  userId: string,
  accountId: string,
  balanceCents: number,
  now: Date = new Date(),
): Promise<void> {
  if (!Number.isInteger(balanceCents) || Math.abs(balanceCents) > MAX_BALANCE_CENTS) {
    throw new RangeError('Saldo no válido');
  }
  const [account] = await db.select({ id: s.bankAccounts.id }).from(s.bankAccounts)
    .where(and(eq(s.bankAccounts.id, accountId), eq(s.bankAccounts.userId, userId)));
  if (!account) throw new NotFoundError('Cuenta no encontrada');
  await db.insert(s.balanceSnapshots).values({ accountId, balanceCents, date: now });
}

export async function getWealth(db: Db, userId: string, now: Date = new Date()): Promise<WealthView> {
  const [accounts, snapshots, entryRows, pocketRows, fundRows, loanRows] = await Promise.all([
    db.select({ id: s.bankAccounts.id, name: s.bankAccounts.name, type: s.bankAccounts.type })
      .from(s.bankAccounts)
      .where(eq(s.bankAccounts.userId, userId))
      .orderBy(asc(s.bankAccounts.name)),
    db.select({
      accountId: s.balanceSnapshots.accountId,
      balanceCents: s.balanceSnapshots.balanceCents,
      date: s.balanceSnapshots.date,
    }).from(s.balanceSnapshots)
      .innerJoin(s.bankAccounts, eq(s.balanceSnapshots.accountId, s.bankAccounts.id))
      .where(eq(s.bankAccounts.userId, userId)),
    db.select({
      accountId: s.entries.accountId,
      kind: s.entries.kind,
      amountCents: s.entries.amountCents,
      status: s.entries.status,
      createdAt: s.entries.createdAt,
      confirmedAt: s.entries.confirmedAt,
    }).from(s.entries)
      .innerJoin(s.months, eq(s.entries.monthId, s.months.id))
      .where(eq(s.months.userId, userId)),
    db.select({
      accountId: s.pockets.accountId,
      amountCents: s.pocketExpenses.amountCents,
      date: s.pocketExpenses.date,
    }).from(s.pocketExpenses)
      .innerJoin(s.pockets, eq(s.pocketExpenses.pocketId, s.pockets.id))
      .where(eq(s.pockets.userId, userId)),
    db.select({
      accountId: s.funds.accountId,
      amountCents: s.fundMovements.amountCents,
      date: s.fundMovements.date,
    }).from(s.fundMovements)
      .innerJoin(s.funds, eq(s.fundMovements.fundId, s.funds.id))
      .where(and(eq(s.funds.userId, userId), lt(s.fundMovements.amountCents, 0))),
    db.select({
      id: s.loans.id,
      person: s.loans.person,
      amountCents: s.loans.amountCents,
      lentYearMonth: s.months.yearMonth,
      note: s.loans.note,
    }).from(s.loans)
      .innerJoin(s.months, eq(s.loans.lentMonthId, s.months.id))
      .where(and(eq(s.loans.userId, userId), isNull(s.loans.repaidMonthId)))
      .orderBy(asc(s.months.yearMonth), asc(s.loans.person)),
  ]);

  const flows: Flow[] = [
    ...entryRows.flatMap((e) => flowOfEntry(e) ?? []),
    ...pocketRows.map((p) => ({ accountId: p.accountId, cents: -p.amountCents, at: p.date })),
    ...fundRows.map((m) => ({ accountId: m.accountId, cents: m.amountCents, at: m.date })),
  ];

  return buildWealth({ accounts, snapshots, flows, loans: loanRows, now });
}
