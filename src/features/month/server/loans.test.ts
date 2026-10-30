import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import * as s from '@/db/schema';
import type { Db } from '@/db/types';
import { createTestDb } from '@/test/db';
import { createFixture, type Fixture } from '@/test/fixtures';
import { ClosedMonthError, NotFoundError } from './entries';
import { lendMoney, markLoanRepaid, type NewLoan } from './loans';
import { ensureMonth, findMonth, getMonthView } from './months';

let db: Db;
let f: Fixture;

beforeEach(async () => {
  db = await createTestDb();
  f = await createFixture(db);
  await ensureMonth(db, f.userId, '2026-10');
});

const lend = (over: Partial<NewLoan> = {}) => lendMoney(db, f.userId, {
  yearMonth: '2026-10', person: 'Juan', amountCents: 20000, accountId: f.accounts.principal, note: null, ...over,
});

describe('lendMoney', () => {
  it('crea el préstamo y un loan_out en el mes que cuenta como gasto', async () => {
    const before = (await getMonthView(db, f.userId, '2026-10'))!.calc.expenseCents;
    await lend();
    const v = (await getMonthView(db, f.userId, '2026-10'))!;
    expect(v.calc.expenseCents).toBe(before + 20000);
    const group = v.categories.find((c) => c.name === 'Préstamos')!;
    expect(group.entries).toMatchObject([{ kind: 'loan_out', name: 'Préstamo a Juan', amountCents: 20000 }]);
    expect(await db.select().from(s.loans)).toHaveLength(1);
  });
  it('reutiliza la categoría Préstamos', async () => {
    await lend();
    await lend({ person: 'Ana' });
    const cats = await db.select().from(s.categories).where(eq(s.categories.name, 'Préstamos'));
    expect(cats).toHaveLength(1);
  });
  it('rechaza importe 0, cuenta ajena y mes cerrado', async () => {
    await expect(lend({ amountCents: 0 })).rejects.toThrow(RangeError);
    const other = await createFixture(db, 'u2');
    await expect(lend({ accountId: other.accounts.principal })).rejects.toThrow(NotFoundError);
    await db.update(s.months).set({ status: 'closed' });
    await expect(lend()).rejects.toThrow(ClosedMonthError);
  });
});

describe('markLoanRepaid', () => {
  it('crea el cobro en el mes en que se cobra y marca el préstamo', async () => {
    const id = await lend();
    await markLoanRepaid(db, f.userId, id, '2026-11');
    const nov = (await getMonthView(db, f.userId, '2026-11'))!;
    expect(nov.categories.find((c) => c.name === 'Préstamos')!.entries)
      .toMatchObject([{ kind: 'loan_repayment', name: 'Juan te devuelve', amountCents: 20000 }]);
    const [loan] = await db.select().from(s.loans);
    expect(loan.repaidMonthId).toBe((await findMonth(db, f.userId, '2026-11'))!.id);
  });
  it('cobrar dos veces no duplica la entrada', async () => {
    const id = await lend();
    await Promise.all([markLoanRepaid(db, f.userId, id, '2026-10'), markLoanRepaid(db, f.userId, id, '2026-10')]);
    await markLoanRepaid(db, f.userId, id, '2026-10');
    const rows = await db.select().from(s.entries).where(eq(s.entries.kind, 'loan_repayment'));
    expect(rows).toHaveLength(1);
  });
  it('no deja cobrar préstamos de otro usuario', async () => {
    const id = await lend();
    const other = await createFixture(db, 'u2');
    await expect(markLoanRepaid(db, other.userId, id, '2026-10')).rejects.toThrow(NotFoundError);
  });
});
