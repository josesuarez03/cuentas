import { eq } from 'drizzle-orm';
import * as s from '../src/db/schema';
import type { Db } from '../src/db/types';
import { isYearMonth } from '../src/lib/year-month';
import type { seedData } from './seed-data';

export type SeedData = typeof seedData;

const validEuros = (x: number) => Number.isFinite(x) && x > 0;

export function validate(data: SeedData) {
  const problems: string[] = [];
  const accountKeys = new Set<string>(data.accounts.map((a) => a.key));
  const categoryNames = new Set<string>(data.categories.map((c) => c.name));
  for (const i of data.items) {
    if (!validEuros(i.euros)) problems.push(`${i.name}: falta el importe`);
    if (!categoryNames.has(i.category)) problems.push(`${i.name}: la categoría «${i.category}» no existe`);
    if (!accountKeys.has(i.account)) problems.push(`${i.name}: la cuenta «${i.account}» no existe`);
    if (i.frequency === 'annual' && !(i.anchorMonth && i.anchorMonth >= 1 && i.anchorMonth <= 12)) problems.push(`${i.name}: falta el mes de cobro`);
    if (i.startMonth !== undefined && !isYearMonth(i.startMonth)) problems.push(`${i.name}: startMonth debe ser YYYY-MM`);
  }
  for (const p of data.pockets) {
    if (!validEuros(p.euros)) problems.push(`Bolsa ${p.name}: falta el límite`);
    if (!accountKeys.has(p.account)) problems.push(`Bolsa ${p.name}: la cuenta «${p.account}» no existe`);
  }
  for (const f of data.funds) {
    if (!validEuros(f.euros)) problems.push(`Fondo ${f.name}: falta la aportación`);
    if (!accountKeys.has(f.account)) problems.push(`Fondo ${f.name}: la cuenta «${f.account}» no existe`);
  }
  for (const a of data.accounts) {
    if (a.balanceEuros !== undefined && !Number.isFinite(a.balanceEuros)) problems.push(`Cuenta ${a.name}: saldo no válido`);
  }
  if (problems.length > 0) throw new Error(`Rellena scripts/seed-data.local.ts:\n- ${problems.join('\n- ')}`);
}

export async function seedOwner(db: Db, ownerId: string, data: SeedData, ym: string) {
  await db.transaction(async (tx) => {
    // Bloquea al usuario para que dos siembras simultáneas no dupliquen datos.
    await tx.select({ id: s.user.id }).from(s.user).where(eq(s.user.id, ownerId)).for('update');
    const existing = await tx.select({ id: s.bankAccounts.id }).from(s.bankAccounts).where(eq(s.bankAccounts.userId, ownerId));
    if (existing.length > 0) throw new Error('Este usuario ya tiene datos; no se siembra dos veces.');

    // Si entraste en la app antes de sembrar, ensureMonth creó el mes actual vacío y no se regeneraría.
    // Es seguro borrarlo: sin cuentas bancarias no puede haber partidas; el resto se borra en cascada.
    await tx.delete(s.months).where(eq(s.months.userId, ownerId));

    const accountRows = await tx.insert(s.bankAccounts).values(data.accounts.map((a) => ({
      userId: ownerId, name: a.name, bank: a.bank, type: a.type, defaultSavingsPercent: a.savingsPercent,
    }))).returning();
    const accountId = (key: string) => {
      const name = data.accounts.find((a) => a.key === key)!.name;
      return accountRows.find((r) => r.name === name)!.id;
    };

    // Como en el primer uso: la deuda de la tarjeta se guarda en negativo.
    const snapshots = data.accounts.flatMap((a) => a.balanceEuros === undefined ? [] : [{
      accountId: accountId(a.key),
      balanceCents: Math.round(a.balanceEuros * 100) * (a.type === 'credit_card' ? -1 : 1),
    }]);
    if (snapshots.length > 0) await tx.insert(s.balanceSnapshots).values(snapshots);

    const categories = await tx.insert(s.categories).values(data.categories.map((c, i) => ({
      userId: ownerId, name: c.name, kind: c.kind, sortOrder: i,
    }))).returning();
    const categoryId = (name: string) => categories.find((c) => c.name === name)!.id;

    await tx.insert(s.recurringItems).values(data.items.map((i) => ({
      userId: ownerId,
      name: i.name,
      kind: i.kind,
      categoryId: categoryId(i.category),
      accountId: accountId(i.account),
      amountCents: Math.round(i.euros * 100),
      frequency: i.frequency,
      startMonth: i.startMonth || ym,
      anchorMonth: i.anchorMonth ?? null,
      paydayDay: i.paydayDay ?? null,
      paydayRule: i.paydayRule ?? 'before',
    })));

    await tx.insert(s.pockets).values(data.pockets.map((p) => ({
      userId: ownerId, name: p.name, accountId: accountId(p.account), monthlyLimitCents: Math.round(p.euros * 100),
    })));
    await tx.insert(s.funds).values(data.funds.map((f) => ({
      userId: ownerId, name: f.name, accountId: accountId(f.account), monthlyAllocationCents: Math.round(f.euros * 100),
    })));
  });
}
