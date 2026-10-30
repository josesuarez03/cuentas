import { asc, desc, eq, sql } from 'drizzle-orm';
import * as s from '@/db/schema';
import type { Db } from '@/db/types';
import { currentYearMonth, type YearMonth } from '@/lib/year-month';
import { installmentProgress } from '../domain/installments';
import type { Preferences, SettingsView } from '../domain/types';

export async function getPreferences(db: Db, userId: string): Promise<Preferences> {
  await db.insert(s.userSettings).values({ userId }).onConflictDoNothing();
  const [row] = await db.select({
    emailNotifications: s.userSettings.emailNotifications,
    pushNotifications: s.userSettings.pushNotifications,
  }).from(s.userSettings).where(eq(s.userSettings.userId, userId));
  return row;
}

export async function updatePreferences(db: Db, userId: string, patch: Partial<Preferences>): Promise<void> {
  await getPreferences(db, userId);
  await db.update(s.userSettings).set({ ...patch, updatedAt: new Date() }).where(eq(s.userSettings.userId, userId));
}

export async function getSettings(db: Db, userId: string, ym: YearMonth = currentYearMonth()): Promise<SettingsView> {
  const accounts = await db.select({
    id: s.bankAccounts.id, name: s.bankAccounts.name, bank: s.bankAccounts.bank,
    type: s.bankAccounts.type, defaultSavingsPercent: s.bankAccounts.defaultSavingsPercent,
  }).from(s.bankAccounts).where(eq(s.bankAccounts.userId, userId)).orderBy(asc(s.bankAccounts.name));

  const categories = await db.select({
    id: s.categories.id, name: s.categories.name, kind: s.categories.kind, parentId: s.categories.parentId,
  }).from(s.categories).where(eq(s.categories.userId, userId)).orderBy(asc(s.categories.sortOrder), asc(s.categories.name));
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const labelOf = (id: string) => {
    const c = categoryById.get(id);
    if (!c) return '';
    const parent = c.parentId ? categoryById.get(c.parentId) : undefined;
    return parent ? `${parent.name} › ${c.name}` : c.name;
  };

  const items = await db.select({
    id: s.recurringItems.id, name: s.recurringItems.name, kind: s.recurringItems.kind,
    categoryId: s.recurringItems.categoryId, accountId: s.recurringItems.accountId, accountName: s.bankAccounts.name,
    amountCents: s.recurringItems.amountCents, frequency: s.recurringItems.frequency, startMonth: s.recurringItems.startMonth,
    anchorMonth: s.recurringItems.anchorMonth, installmentsTotal: s.recurringItems.installmentsTotal,
    paydayDay: s.recurringItems.paydayDay, paydayRule: s.recurringItems.paydayRule, active: s.recurringItems.active,
  }).from(s.recurringItems)
    .innerJoin(s.bankAccounts, eq(s.recurringItems.accountId, s.bankAccounts.id))
    .where(eq(s.recurringItems.userId, userId))
    .orderBy(desc(s.recurringItems.kind), asc(s.recurringItems.name));
  const recurring = items.map((r) => {
    const progress = installmentProgress(r, ym);
    return {
      ...r,
      categoryLabel: labelOf(r.categoryId),
      currentInstallment: progress.current,
      remainingInstallments: progress.remaining,
    };
  });

  const pockets = await db.select({
    id: s.pockets.id, name: s.pockets.name, accountId: s.pockets.accountId, monthlyLimitCents: s.pockets.monthlyLimitCents,
  }).from(s.pockets).where(eq(s.pockets.userId, userId)).orderBy(asc(s.pockets.name));

  const funds = await db.select({
    id: s.funds.id, name: s.funds.name, accountId: s.funds.accountId, monthlyAllocationCents: s.funds.monthlyAllocationCents,
    balanceCents: sql<number>`coalesce(sum(${s.fundMovements.amountCents}), 0)`.mapWith(Number),
  }).from(s.funds)
    .leftJoin(s.fundMovements, eq(s.fundMovements.fundId, s.funds.id))
    .where(eq(s.funds.userId, userId))
    .groupBy(s.funds.id)
    .orderBy(asc(s.funds.name));

  return { accounts, categories, recurring, pockets, funds, preferences: await getPreferences(db, userId) };
}
