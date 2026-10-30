import { beforeEach, describe, expect, it } from 'vitest';
import * as s from '@/db/schema';
import type { Db } from '@/db/types';
import { createTestDb } from '@/test/db';
import { createFixture, type Fixture } from '@/test/fixtures';
import { ClosedMonthError, NotFoundError } from './entries';
import { ensureMonth, getMonthView } from './months';
import { addPocketExpense, spendFromFund } from './pockets';

let db: Db;
let f: Fixture;

beforeEach(async () => {
  db = await createTestDb();
  f = await createFixture(db);
  await ensureMonth(db, f.userId, '2026-10');
});

describe('addPocketExpense', () => {
  it('suma al gastado de la bolsa en el mes', async () => {
    await addPocketExpense(db, f.userId, { yearMonth: '2026-10', pocketId: f.pocketId, amountCents: 1250, note: 'Cine' });
    const v = (await getMonthView(db, f.userId, '2026-10'))!;
    expect(v.pockets[0].spentCents).toBe(1250);
  });
  it('rechaza bolsa ajena, bolsa que no está en el mes, importe 0 y mes cerrado', async () => {
    const other = await createFixture(db, 'u2');
    await expect(addPocketExpense(db, f.userId, { yearMonth: '2026-10', pocketId: other.pocketId, amountCents: 1, note: null })).rejects.toThrow(NotFoundError);
    const [late] = await db.insert(s.pockets).values({ userId: f.userId, name: 'Viajes', accountId: f.accounts.principal, monthlyLimitCents: 1 }).returning();
    await expect(addPocketExpense(db, f.userId, { yearMonth: '2026-10', pocketId: late.id, amountCents: 1, note: null })).rejects.toThrow(NotFoundError);
    await expect(addPocketExpense(db, f.userId, { yearMonth: '2026-10', pocketId: f.pocketId, amountCents: 0, note: null })).rejects.toThrow(RangeError);
    await db.update(s.months).set({ status: 'closed' });
    await expect(addPocketExpense(db, f.userId, { yearMonth: '2026-10', pocketId: f.pocketId, amountCents: 1, note: null })).rejects.toThrow(ClosedMonthError);
  });
});

describe('spendFromFund', () => {
  it('apunta un movimiento negativo: baja el saldo y no cuenta en Gastos ni en Apartados', async () => {
    const before = (await getMonthView(db, f.userId, '2026-10'))!;
    await spendFromFund(db, f.userId, { yearMonth: '2026-10', fundId: f.fundId, amountCents: 2000, note: 'Regalo Ana' });
    const after = (await getMonthView(db, f.userId, '2026-10'))!;
    expect(after.funds[0].balanceCents).toBe(3000);
    expect(after.calc.expenseCents).toBe(before.calc.expenseCents);
    expect(after.calc.fundsCents).toBe(before.calc.fundsCents);
  });
  it('no deja gastar más de lo que tiene la hucha', async () => {
    await expect(spendFromFund(db, f.userId, { yearMonth: '2026-10', fundId: f.fundId, amountCents: 5001, note: null }))
      .rejects.toThrow('La hucha solo tiene 50,00 €.');
  });
  it('no deja tocar huchas ajenas', async () => {
    const other = await createFixture(db, 'u2');
    await expect(spendFromFund(db, f.userId, { yearMonth: '2026-10', fundId: other.fundId, amountCents: 1, note: null })).rejects.toThrow(NotFoundError);
  });
});
