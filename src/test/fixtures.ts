import * as s from '@/db/schema';
import type { Db } from '@/db/types';

export interface Fixture {
  userId: string;
  accounts: { principal: string; trade: string; ahorro: string };
  categories: { ingresos: string; piso: string; suscripciones: string; tarjeta: string };
  items: { nomina: string; gas: string; portatil: string; prime: string };
  pocketId: string;
  fundId: string;
}

export async function createFixture(db: Db, userId = 'u1'): Promise<Fixture> {
  await db.insert(s.user).values({ id: userId, name: 'Jose', email: `${userId}@example.com` });

  const [principal, trade, ahorro] = await db.insert(s.bankAccounts).values([
    { userId, name: 'BBVA principal', bank: 'BBVA', type: 'checking' },
    { userId, name: 'Trade', bank: 'Trade Republic', type: 'investment', defaultSavingsPercent: 80 },
    { userId, name: 'BBVA ahorro', bank: 'BBVA', type: 'savings', defaultSavingsPercent: 20 },
  ]).returning();

  const [ingresos, piso, suscripciones, tarjeta] = await db.insert(s.categories).values([
    { userId, name: 'Ingresos', kind: 'income', sortOrder: 0 },
    { userId, name: 'Piso', kind: 'expense', sortOrder: 1 },
    { userId, name: 'Suscripciones', kind: 'expense', sortOrder: 2 },
    { userId, name: 'Tarjeta', kind: 'expense', sortOrder: 3 },
  ]).returning();

  const [nomina, gas, portatil, prime] = await db.insert(s.recurringItems).values([
    { userId, name: 'Nómina', kind: 'income', categoryId: ingresos.id, accountId: principal.id, amountCents: 187000, frequency: 'monthly', startMonth: '2026-10', paydayDay: 27 },
    { userId, name: 'Gas', kind: 'expense', categoryId: piso.id, accountId: principal.id, amountCents: 2800, frequency: 'bimonthly', startMonth: '2026-10' },
    { userId, name: 'Portátil', kind: 'expense', categoryId: tarjeta.id, accountId: principal.id, amountCents: 10000, frequency: 'installments', startMonth: '2026-10', installmentsTotal: 6 },
    { userId, name: 'Prime', kind: 'expense', categoryId: suscripciones.id, accountId: principal.id, amountCents: 4990, frequency: 'annual', startMonth: '2026-10', anchorMonth: 3 },
  ]).returning();

  const [pocket] = await db.insert(s.pockets).values({ userId, name: 'Ocio', accountId: principal.id, monthlyLimitCents: 15000 }).returning();
  const [fund] = await db.insert(s.funds).values({ userId, name: 'Regalos', accountId: ahorro.id, monthlyAllocationCents: 5000 }).returning();

  return {
    userId,
    accounts: { principal: principal.id, trade: trade.id, ahorro: ahorro.id },
    categories: { ingresos: ingresos.id, piso: piso.id, suscripciones: suscripciones.id, tarjeta: tarjeta.id },
    items: { nomina: nomina.id, gas: gas.id, portatil: portatil.id, prime: prime.id },
    pocketId: pocket.id,
    fundId: fund.id,
  };
}
