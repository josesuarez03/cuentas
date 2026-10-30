import { and, eq, isNull } from 'drizzle-orm';
import * as s from '@/db/schema';
import type { Db } from '@/db/types';
import { currentYearMonth, type YearMonth } from '@/lib/year-month';
import { NotFoundError, openMonth } from './entries';
import { ensureMonth } from './months';

export const LOANS_CATEGORY = 'Préstamos';

export interface NewLoan {
  yearMonth: string;
  person: string;
  amountCents: number;
  accountId: string;
  note: string | null;
}

async function loansCategoryId(db: Db, userId: string): Promise<string> {
  const [found] = await db.select({ id: s.categories.id }).from(s.categories)
    .where(and(eq(s.categories.userId, userId), eq(s.categories.name, LOANS_CATEGORY), isNull(s.categories.parentId)));
  if (found) return found.id;
  const [created] = await db.insert(s.categories)
    .values({ userId, name: LOANS_CATEGORY, kind: 'expense', sortOrder: 999 }).returning({ id: s.categories.id });
  return created.id;
}

export async function lendMoney(db: Db, userId: string, input: NewLoan): Promise<string> {
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) throw new RangeError('Importe no válido');
  const month = await openMonth(db, userId, input.yearMonth);
  const [account] = await db.select({ id: s.bankAccounts.id }).from(s.bankAccounts)
    .where(and(eq(s.bankAccounts.id, input.accountId), eq(s.bankAccounts.userId, userId)));
  if (!account) throw new NotFoundError('Cuenta no encontrada');

  return db.transaction(async (tx) => {
    const categoryId = await loansCategoryId(tx, userId);
    const [loan] = await tx.insert(s.loans).values({
      userId,
      person: input.person,
      amountCents: input.amountCents,
      accountId: input.accountId,
      lentMonthId: month.id,
      note: input.note,
    }).returning({ id: s.loans.id });
    await tx.insert(s.entries).values({
      monthId: month.id,
      recurringItemId: null,
      kind: 'loan_out',
      name: `Préstamo a ${input.person}`,
      categoryId,
      accountId: input.accountId,
      amountCents: input.amountCents,
      status: null,
    });
    return loan.id;
  });
}

export async function markLoanRepaid(
  db: Db,
  userId: string,
  loanId: string,
  ym: YearMonth = currentYearMonth(),
): Promise<void> {
  const [loan] = await db.select().from(s.loans)
    .where(and(eq(s.loans.id, loanId), eq(s.loans.userId, userId)));
  if (!loan) throw new NotFoundError('Préstamo no encontrado');
  if (loan.repaidMonthId) return;

  await ensureMonth(db, userId, ym);
  const month = await openMonth(db, userId, ym);

  await db.transaction(async (tx) => {
    const claimed = await tx.update(s.loans).set({ repaidMonthId: month.id })
      .where(and(eq(s.loans.id, loanId), eq(s.loans.userId, userId), isNull(s.loans.repaidMonthId)))
      .returning({ id: s.loans.id });
    if (claimed.length === 0) return;
    const categoryId = await loansCategoryId(tx, userId);
    await tx.insert(s.entries).values({
      monthId: month.id,
      recurringItemId: null,
      kind: 'loan_repayment',
      name: `${loan.person} te devuelve`,
      categoryId,
      accountId: loan.accountId,
      amountCents: loan.amountCents,
      status: null,
    });
  });
}
