import { eq } from 'drizzle-orm';
import { db } from '../src/db';
import * as s from '../src/db/schema';
import { currentYearMonth, isYearMonth } from '../src/lib/year-month';
import { seedData } from './seed-data';

function validate() {
  const problems: string[] = [];
  for (const i of seedData.items) {
    if (i.euros <= 0) problems.push(`${i.name}: falta el importe`);
    if (i.frequency === 'annual' && !(i.anchorMonth && i.anchorMonth >= 1 && i.anchorMonth <= 12)) problems.push(`${i.name}: falta el mes de cobro`);
    if (i.startMonth !== undefined && !isYearMonth(i.startMonth)) problems.push(`${i.name}: startMonth debe ser YYYY-MM`);
  }
  for (const p of seedData.pockets) if (p.euros <= 0) problems.push(`Bolsa ${p.name}: falta el límite`);
  if (problems.length > 0) throw new Error(`Rellena scripts/seed-data.ts:\n- ${problems.join('\n- ')}`);
}

async function main() {
  validate();
  const email = process.env.SEED_EMAIL;
  if (!email) throw new Error('Define SEED_EMAIL en .env.local');
  const [owner] = await db.select().from(s.user).where(eq(s.user.email, email));
  if (!owner) throw new Error(`No existe ${email}. Entra una vez en la app con Google y vuelve a ejecutar.`);
  const existing = await db.select().from(s.bankAccounts).where(eq(s.bankAccounts.userId, owner.id));
  if (existing.length > 0) throw new Error('Este usuario ya tiene datos; no se siembra dos veces.');

  const ym = currentYearMonth();
  await db.transaction(async (tx) => {
    const accounts = await tx.insert(s.bankAccounts).values(seedData.accounts.map((a) => ({
      userId: owner.id, name: a.name, bank: a.bank, type: a.type, defaultSavingsPercent: a.savingsPercent,
    }))).returning();
    const accountId = (key: string) => accounts[seedData.accounts.findIndex((a) => a.key === key)].id;

    const categories = await tx.insert(s.categories).values(seedData.categories.map((c, i) => ({
      userId: owner.id, name: c.name, kind: c.kind, sortOrder: i,
    }))).returning();
    const categoryId = (name: string) => categories.find((c) => c.name === name)!.id;

    await tx.insert(s.recurringItems).values(seedData.items.map((i) => ({
      userId: owner.id,
      name: i.name,
      kind: i.kind,
      categoryId: categoryId(i.category),
      accountId: accountId(i.account),
      amountCents: Math.round(i.euros * 100),
      frequency: i.frequency,
      startMonth: i.startMonth || ym,
      anchorMonth: i.anchorMonth ?? null,
      paydayDay: i.paydayDay ?? null,
    })));

    await tx.insert(s.pockets).values(seedData.pockets.map((p) => ({
      userId: owner.id, name: p.name, accountId: accountId(p.account), monthlyLimitCents: Math.round(p.euros * 100),
    })));
    await tx.insert(s.funds).values(seedData.funds.map((f) => ({
      userId: owner.id, name: f.name, accountId: accountId(f.account), monthlyAllocationCents: Math.round(f.euros * 100),
    })));
  });
  console.log(`Datos iniciales creados para ${email}.`);
}

main().then(() => process.exit(0)).catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
