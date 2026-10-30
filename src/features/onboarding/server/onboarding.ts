import { eq } from 'drizzle-orm';
import * as s from '@/db/schema';
import type { Db } from '@/db/types';
import type { YearMonth } from '@/lib/year-month';
import { BASE_CATEGORIES, type OnboardingInput } from '../domain/onboarding';

export async function needsOnboarding(db: Db, userId: string): Promise<boolean> {
  const rows = await db.select({ id: s.bankAccounts.id }).from(s.bankAccounts).where(eq(s.bankAccounts.userId, userId)).limit(1);
  return rows.length === 0;
}

export async function completeOnboarding(db: Db, userId: string, input: OnboardingInput, ym: YearMonth, now: Date = new Date()): Promise<void> {
  await db.transaction(async (tx) => {
    // Bloquea al usuario para que dos ejecuciones simultáneas no dupliquen datos.
    await tx.select({ id: s.user.id }).from(s.user).where(eq(s.user.id, userId)).for('update');
    const existing = await tx.select({ id: s.bankAccounts.id }).from(s.bankAccounts).where(eq(s.bankAccounts.userId, userId)).limit(1);
    if (existing.length > 0) throw new RangeError('Ya tienes cuentas; cambia lo que quieras en Ajustes.');

    // Si entró antes, ensureMonth dejó el mes actual vacío y no se regeneraría; sin cuentas es seguro borrarlo.
    await tx.delete(s.months).where(eq(s.months.userId, userId));

    const savingsIndex = input.accounts.findIndex((a) => a.type === 'savings' || a.type === 'investment');
    const accountRows: { id: string }[] = [];
    for (const [i, a] of input.accounts.entries()) {
      const [row] = await tx.insert(s.bankAccounts).values({
        userId, name: a.name, bank: a.bank, type: a.type, defaultSavingsPercent: i === savingsIndex ? 100 : 0,
      }).returning({ id: s.bankAccounts.id });
      accountRows.push(row);
    }

    const snapshots = input.accounts.flatMap((a, i) => a.balanceCents === null ? [] : [{
      accountId: accountRows[i].id,
      balanceCents: a.type === 'credit_card' ? -a.balanceCents : a.balanceCents,
      date: now,
    }]);
    if (snapshots.length > 0) await tx.insert(s.balanceSnapshots).values(snapshots);

    const categories = await tx.insert(s.categories).values(BASE_CATEGORIES.map((c, i) => ({
      userId, name: c.name, kind: c.kind, sortOrder: i,
    }))).returning();
    const categoryId = (name: string) => categories.find((c) => c.name === name)!.id;

    if (input.salary) {
      await tx.insert(s.recurringItems).values({
        userId, name: 'Nómina', kind: 'income', categoryId: categoryId('Ingresos'),
        accountId: accountRows[input.salary.accountIndex].id, amountCents: input.salary.amountCents,
        frequency: 'monthly', startMonth: ym, paydayDay: input.salary.paydayDay,
      });
    }
    if (input.items.length > 0) {
      await tx.insert(s.recurringItems).values(input.items.map((i) => ({
        userId, name: i.name, kind: 'expense' as const, categoryId: categoryId(i.category),
        accountId: accountRows[i.accountIndex].id, amountCents: i.amountCents,
        frequency: 'monthly' as const, startMonth: ym,
      })));
    }
  });
}
