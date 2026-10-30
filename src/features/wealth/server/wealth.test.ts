import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import * as s from '@/db/schema';
import type { Db } from '@/db/types';
import { createTestDb } from '@/test/db';
import { createFixture, type Fixture } from '@/test/fixtures';
import { NotFoundError } from '@/features/month/server/entries';
import { ensureMonth, findMonth } from '@/features/month/server/months';
import { addBalanceSnapshot, getWealth } from './wealth';

let db: Db;
let f: Fixture;
const NOW = new Date('2026-10-30T12:00:00Z');

beforeEach(async () => {
  db = await createTestDb();
  f = await createFixture(db);
  await ensureMonth(db, f.userId, '2026-10');
  await db.update(s.entries).set({ createdAt: new Date('2026-10-01T00:00:00Z') });
});

it('cuenta un ingreso confirmado después del saldo aunque se generó antes', async () => {
  await addBalanceSnapshot(db, f.userId, f.accounts.principal, 200000, new Date('2026-10-15T00:00:00Z'));
  const nomina = (await db.select().from(s.entries)).find((e) => e.name === 'Nómina')!;
  await db.update(s.entries).set({ status: 'confirmed', confirmedAt: new Date('2026-10-27T08:00:00Z') }).where(eq(s.entries.id, nomina.id));
  const w = await getWealth(db, f.userId, NOW);
  expect(w.accounts.find((a) => a.accountId === f.accounts.principal)!.estimatedCents).toBe(200000 + 187000);
});

it('no cuenta un ingreso pendiente; sí gastos de bolsa y gastos de hucha; no las asignaciones a huchas', async () => {
  const monthId = (await findMonth(db, f.userId, '2026-10'))!.id;
  await addBalanceSnapshot(db, f.userId, f.accounts.principal, 100000, new Date('2026-10-15T00:00:00Z'));
  await addBalanceSnapshot(db, f.userId, f.accounts.ahorro, 50000, new Date('2026-10-15T00:00:00Z'));
  await db.insert(s.pocketExpenses).values({ pocketId: f.pocketId, monthId, amountCents: 3000, date: new Date('2026-10-20T00:00:00Z') });
  await db.insert(s.fundMovements).values([
    { fundId: f.fundId, monthId, amountCents: 5000, date: new Date('2026-10-20T00:00:00Z') },
    { fundId: f.fundId, monthId, amountCents: -2000, date: new Date('2026-10-21T00:00:00Z') },
  ]);
  const w = await getWealth(db, f.userId, NOW);
  expect(w.accounts.find((a) => a.accountId === f.accounts.principal)!.estimatedCents).toBe(97000);
  expect(w.accounts.find((a) => a.accountId === f.accounts.ahorro)!.estimatedCents).toBe(48000);
});

it('solo ve sus cuentas y préstamos pendientes', async () => {
  const other = await createFixture(db, 'u2');
  await addBalanceSnapshot(db, other.userId, other.accounts.principal, 999999, NOW);
  const monthId = (await findMonth(db, f.userId, '2026-10'))!.id;
  await db.insert(s.loans).values([
    { userId: f.userId, person: 'Juan', amountCents: 20000, accountId: f.accounts.principal, lentMonthId: monthId },
    { userId: f.userId, person: 'Ana', amountCents: 1000, accountId: f.accounts.principal, lentMonthId: monthId, repaidMonthId: monthId },
  ]);
  const w = await getWealth(db, f.userId, NOW);
  expect(w.totalCents).toBe(0);
  expect(w.loans).toEqual([{ id: expect.any(String), person: 'Juan', amountCents: 20000, lentYearMonth: '2026-10', note: null }]);
});

it('no deja apuntar el saldo de una cuenta ajena', async () => {
  const other = await createFixture(db, 'u2');
  await expect(addBalanceSnapshot(db, f.userId, other.accounts.principal, 1)).rejects.toThrow(NotFoundError);
});

it('rechaza saldos no enteros', async () => {
  await expect(addBalanceSnapshot(db, f.userId, f.accounts.principal, 1.5)).rejects.toThrow(RangeError);
});
