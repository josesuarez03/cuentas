import { and, asc, desc, eq, gt, isNotNull, lt, sql } from 'drizzle-orm';
import * as s from '@/db/schema';
import type { Db } from '@/db/types';
import { generateEntries } from '@/features/month/domain/generation';
import { recomputeView, type CategoryGroup, type MonthView } from '@/features/month/domain/month-view';
import type { YearMonth } from '@/lib/year-month';

export async function findMonth(db: Db, userId: string, ym: YearMonth) {
  const [m] = await db.select().from(s.months)
    .where(and(eq(s.months.userId, userId), eq(s.months.yearMonth, ym))).limit(1);
  return m ?? null;
}

export async function lastAmounts(db: Db, userId: string, ym: YearMonth): Promise<Map<string, number>> {
  const rows = await db
    .selectDistinctOn([s.entries.recurringItemId], {
      itemId: s.entries.recurringItemId,
      amountCents: s.entries.amountCents,
    })
    .from(s.entries)
    .innerJoin(s.months, eq(s.entries.monthId, s.months.id))
    .where(and(eq(s.months.userId, userId), lt(s.months.yearMonth, ym), isNotNull(s.entries.recurringItemId)))
    .orderBy(s.entries.recurringItemId, desc(s.months.yearMonth));
  return new Map(rows.map((r) => [r.itemId as string, r.amountCents]));
}

async function copySplit(db: Db, userId: string, monthId: string, prevMonthId: string | undefined) {
  const previous = prevMonthId
    ? await db.select({ accountId: s.monthSavingsSplit.accountId, percent: s.monthSavingsSplit.percent })
      .from(s.monthSavingsSplit).where(eq(s.monthSavingsSplit.monthId, prevMonthId))
    : [];
  const source = previous.length > 0
    ? previous
    : await db.select({ accountId: s.bankAccounts.id, percent: s.bankAccounts.defaultSavingsPercent })
      .from(s.bankAccounts)
      .where(and(eq(s.bankAccounts.userId, userId), gt(s.bankAccounts.defaultSavingsPercent, 0)));
  if (source.length > 0) {
    await db.insert(s.monthSavingsSplit).values(source.map((r) => ({ monthId, ...r })));
  }
}

async function copyPockets(db: Db, userId: string, monthId: string, prevMonthId: string | undefined) {
  const userPockets = await db.select().from(s.pockets).where(eq(s.pockets.userId, userId));
  if (userPockets.length === 0) return;
  const previous = prevMonthId
    ? await db.select().from(s.monthPockets).where(eq(s.monthPockets.monthId, prevMonthId))
    : [];
  const prevLimit = new Map(previous.map((p) => [p.pocketId, p.limitCents]));
  await db.insert(s.monthPockets).values(userPockets.map((p) => ({
    monthId,
    pocketId: p.id,
    limitCents: prevLimit.get(p.id) ?? p.monthlyLimitCents,
  })));
}

async function allocateFunds(db: Db, userId: string, monthId: string) {
  const userFunds = await db.select().from(s.funds)
    .where(and(eq(s.funds.userId, userId), gt(s.funds.monthlyAllocationCents, 0)));
  if (userFunds.length === 0) return;
  await db.insert(s.fundMovements).values(userFunds.map((f) => ({
    fundId: f.id,
    monthId,
    amountCents: f.monthlyAllocationCents,
    note: 'Asignación mensual',
  })));
}

export async function ensureMonth(db: Db, userId: string, ym: YearMonth): Promise<string> {
  const existing = await findMonth(db, userId, ym);
  if (existing) return existing.id;

  return db.transaction(async (tx) => {
    const [created] = await tx.insert(s.months).values({ userId, yearMonth: ym })
      .onConflictDoNothing().returning({ id: s.months.id });
    if (!created) return (await findMonth(tx, userId, ym))!.id;

    const items = await tx.select().from(s.recurringItems)
      .where(and(eq(s.recurringItems.userId, userId), eq(s.recurringItems.active, true)));
    const generated = generateEntries(items, await lastAmounts(tx, userId, ym), ym);
    if (generated.length > 0) {
      await tx.insert(s.entries).values(generated.map((g) => ({ ...g, monthId: created.id })));
    }

    const [prev] = await tx.select({ id: s.months.id }).from(s.months)
      .where(and(eq(s.months.userId, userId), lt(s.months.yearMonth, ym)))
      .orderBy(desc(s.months.yearMonth)).limit(1);

    await copySplit(tx, userId, created.id, prev?.id);
    await copyPockets(tx, userId, created.id, prev?.id);
    await allocateFunds(tx, userId, created.id);
    return created.id;
  });
}

const FREQUENCY_LABEL = { monthly: 'Mensual', bimonthly: 'Cada 2 meses', annual: 'Anual' } as const;

function noteFor(r: {
  status: 'pending' | 'confirmed' | null;
  frequency: 'monthly' | 'bimonthly' | 'annual' | 'installments' | null;
  installmentNumber: number | null;
  installmentsTotal: number | null;
  accountName: string;
}): string {
  const when = r.frequency === null
    ? 'Puntual'
    : r.frequency === 'installments'
      ? `Cuota ${r.installmentNumber} de ${r.installmentsTotal}`
      : FREQUENCY_LABEL[r.frequency];
  const pending = r.status === 'pending' ? 'Pendiente · ' : '';
  return `${pending}${when} · ${r.accountName}`;
}

export async function getMonthView(db: Db, userId: string, ym: YearMonth): Promise<MonthView | null> {
  const month = await findMonth(db, userId, ym);
  if (!month) return null;

  const cats = await db.select().from(s.categories)
    .where(eq(s.categories.userId, userId))
    .orderBy(asc(s.categories.sortOrder), asc(s.categories.name));
  const topOf = new Map(cats.map((c) => [c.id, c.parentId ?? c.id]));
  const groups = new Map<string, CategoryGroup>();
  for (const c of cats) if (!c.parentId) groups.set(c.id, { id: c.id, name: c.name, totalCents: 0, entries: [] });

  const rows = await db.select({
    id: s.entries.id,
    kind: s.entries.kind,
    name: s.entries.name,
    amountCents: s.entries.amountCents,
    status: s.entries.status,
    installmentNumber: s.entries.installmentNumber,
    categoryId: s.entries.categoryId,
    accountName: s.bankAccounts.name,
    frequency: s.recurringItems.frequency,
    installmentsTotal: s.recurringItems.installmentsTotal,
  })
    .from(s.entries)
    .innerJoin(s.bankAccounts, eq(s.entries.accountId, s.bankAccounts.id))
    .leftJoin(s.recurringItems, eq(s.entries.recurringItemId, s.recurringItems.id))
    .where(eq(s.entries.monthId, month.id))
    .orderBy(asc(s.entries.createdAt), asc(s.entries.name));

  for (const r of rows) {
    const group = groups.get(topOf.get(r.categoryId) ?? r.categoryId);
    if (!group) continue;
    group.entries.push({
      id: r.id, kind: r.kind, name: r.name, note: noteFor(r), amountCents: r.amountCents, status: r.status,
    });
  }

  const pocketRows = await db.select({ id: s.pockets.id, name: s.pockets.name, limitCents: s.monthPockets.limitCents })
    .from(s.monthPockets).innerJoin(s.pockets, eq(s.monthPockets.pocketId, s.pockets.id))
    .where(eq(s.monthPockets.monthId, month.id)).orderBy(asc(s.pockets.name));
  const spentRows = await db.select({
    pocketId: s.pocketExpenses.pocketId,
    spent: sql<number>`coalesce(sum(${s.pocketExpenses.amountCents}), 0)::int`,
  }).from(s.pocketExpenses).where(eq(s.pocketExpenses.monthId, month.id)).groupBy(s.pocketExpenses.pocketId);
  const spentOf = new Map(spentRows.map((r) => [r.pocketId, Number(r.spent)]));

  const fundRows = await db.select({
    id: s.funds.id,
    name: s.funds.name,
    allocated: sql<number>`coalesce(sum(${s.fundMovements.amountCents}) filter (where ${s.fundMovements.monthId} = ${month.id} and ${s.fundMovements.amountCents} > 0), 0)::int`,
    balance: sql<number>`coalesce(sum(${s.fundMovements.amountCents}), 0)::int`,
  })
    .from(s.funds).leftJoin(s.fundMovements, eq(s.fundMovements.fundId, s.funds.id))
    .where(eq(s.funds.userId, userId)).groupBy(s.funds.id, s.funds.name).orderBy(asc(s.funds.name));

  const splitRows = await db.select({
    accountId: s.monthSavingsSplit.accountId,
    accountName: s.bankAccounts.name,
    percent: s.monthSavingsSplit.percent,
  })
    .from(s.monthSavingsSplit).innerJoin(s.bankAccounts, eq(s.monthSavingsSplit.accountId, s.bankAccounts.id))
    .where(eq(s.monthSavingsSplit.monthId, month.id))
    .orderBy(desc(s.monthSavingsSplit.percent), asc(s.bankAccounts.name));

  return recomputeView({
    yearMonth: month.yearMonth,
    status: month.status,
    categories: [...groups.values()].filter((g) => g.entries.length > 0),
    pockets: pocketRows.map((p) => ({ ...p, spentCents: spentOf.get(p.id) ?? 0 })),
    funds: fundRows.map((r) => ({ id: r.id, name: r.name, allocatedCents: Number(r.allocated), balanceCents: Number(r.balance) })),
    split: splitRows.map((r) => ({ ...r, cents: 0 })),
  });
}
