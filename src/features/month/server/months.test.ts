import { and, eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import * as s from '@/db/schema';
import type { Db } from '@/db/types';
import { createTestDb } from '@/test/db';
import { createFixture, type Fixture } from '@/test/fixtures';
import { ensureMonth, getMonthView } from './months';

let db: Db;
let f: Fixture;

beforeEach(async () => {
  db = await createTestDb();
  f = await createFixture(db);
});

const entriesOf = (monthId: string) => db.select().from(s.entries).where(eq(s.entries.monthId, monthId));

describe('ensureMonth', () => {
  it('genera las partidas que tocan ese mes', async () => {
    const id = await ensureMonth(db, f.userId, '2026-10');
    const rows = await entriesOf(id);
    expect(rows.map((r) => r.name).sort()).toEqual(['Gas', 'Nómina', 'Portátil']);
    expect(rows.find((r) => r.name === 'Portátil')!.installmentNumber).toBe(1);
    expect(rows.find((r) => r.name === 'Nómina')!.status).toBe('pending');
  });

  it('es idempotente', async () => {
    const a = await ensureMonth(db, f.userId, '2026-10');
    const b = await ensureMonth(db, f.userId, '2026-10');
    expect(a).toBe(b);
    expect(await entriesOf(a)).toHaveLength(3);
  });

  it('hereda el último importe de cada partida', async () => {
    const oct = await ensureMonth(db, f.userId, '2026-10');
    await db.update(s.entries).set({ amountCents: 3100 })
      .where(and(eq(s.entries.monthId, oct), eq(s.entries.recurringItemId, f.items.gas)));
    await db.update(s.entries).set({ amountCents: 179000 })
      .where(and(eq(s.entries.monthId, oct), eq(s.entries.recurringItemId, f.items.nomina)));

    const nov = await entriesOf(await ensureMonth(db, f.userId, '2026-11'));
    expect(nov.find((r) => r.name === 'Nómina')!.amountCents).toBe(179000);
    expect(nov.some((r) => r.name === 'Gas')).toBe(false);

    const dec = await entriesOf(await ensureMonth(db, f.userId, '2026-12'));
    expect(dec.find((r) => r.name === 'Gas')!.amountCents).toBe(3100);
  });

  it('copia el reparto de ahorro del mes anterior', async () => {
    const oct = await ensureMonth(db, f.userId, '2026-10');
    await db.delete(s.monthSavingsSplit).where(eq(s.monthSavingsSplit.monthId, oct));
    await db.insert(s.monthSavingsSplit).values([
      { monthId: oct, accountId: f.accounts.trade, percent: 50 },
      { monthId: oct, accountId: f.accounts.ahorro, percent: 50 },
    ]);
    await ensureMonth(db, f.userId, '2026-11');
    const v = await getMonthView(db, f.userId, '2026-11');
    expect(v!.split.map((x) => x.percent)).toEqual([50, 50]);
  });
});

describe('getMonthView', () => {
  it('devuelve null si el mes no existe', async () => {
    expect(await getMonthView(db, f.userId, '2026-10')).toBeNull();
  });

  it('los ingresos pendientes traen su día de cobro; el resto no', async () => {
    await ensureMonth(db, f.userId, '2026-12');
    const v = (await getMonthView(db, f.userId, '2026-12'))!;
    const all = v.categories.flatMap((c) => c.entries);
    expect(all.find((e) => e.name === 'Nómina')!.paydayDate).toBe('2026-12-24');
    expect('paydayDate' in all.find((e) => e.name === 'Gas')!).toBe(false);
  });

  it('agrupa, anota y calcula el disponible', async () => {
    await ensureMonth(db, f.userId, '2026-10');
    const v = (await getMonthView(db, f.userId, '2026-10'))!;
    expect(v.categories.map((c) => [c.name, c.totalCents])).toEqual([
      ['Ingresos', 187000],
      ['Piso', -2800],
      ['Tarjeta', -10000],
    ]);
    expect(v.categories[0].entries[0].note).toBe('Pendiente · Mensual · BBVA principal');
    expect(v.categories[1].entries[0].note).toBe('Cada 2 meses · BBVA principal');
    expect(v.categories[2].entries[0].note).toBe('Cuota 1 de 6 · BBVA principal');
    expect(v.pockets).toEqual([{ id: f.pocketId, name: 'Ocio', limitCents: 15000, spentCents: 0 }]);
    expect(v.funds).toEqual([{ id: f.fundId, name: 'Regalos', allocatedCents: 5000, balanceCents: 5000 }]);
    expect(v.calc.availableCents).toBe(187000 - 2800 - 10000 - 15000 - 5000);
    expect(v.split.map((x) => [x.accountName, x.percent, x.cents])).toEqual([
      ['Trade', 80, 123360],
      ['BBVA ahorro', 20, 30840],
    ]);
  });

  it('no ve meses de otro usuario', async () => {
    await createFixture(db, 'u2');
    await ensureMonth(db, 'u2', '2026-10');
    expect(await getMonthView(db, f.userId, '2026-10')).toBeNull();
  });
});

describe('ensureMonth (herencia y asignaciones entre meses)', () => {
  it('hereda el importe de la última aparición, no de la primera', async () => {
    const oct = await ensureMonth(db, f.userId, '2026-10');
    await db.update(s.entries).set({ amountCents: 179000 })
      .where(and(eq(s.entries.monthId, oct), eq(s.entries.recurringItemId, f.items.nomina)));
    const nov = await ensureMonth(db, f.userId, '2026-11');
    await db.update(s.entries).set({ amountCents: 180000 })
      .where(and(eq(s.entries.monthId, nov), eq(s.entries.recurringItemId, f.items.nomina)));

    const dec = await entriesOf(await ensureMonth(db, f.userId, '2026-12'));
    expect(dec.find((r) => r.name === 'Nómina')!.amountCents).toBe(180000);
  });

  it('copia el límite de bolsa del mes anterior, no el de la plantilla', async () => {
    const oct = await ensureMonth(db, f.userId, '2026-10');
    await db.update(s.monthPockets).set({ limitCents: 20000 })
      .where(and(eq(s.monthPockets.monthId, oct), eq(s.monthPockets.pocketId, f.pocketId)));
    await ensureMonth(db, f.userId, '2026-11');
    const v = (await getMonthView(db, f.userId, '2026-11'))!;
    expect(v.pockets.map((p) => p.limitCents)).toEqual([20000]);
  });

  it('asigna la hucha cada mes y acumula el saldo', async () => {
    await ensureMonth(db, f.userId, '2026-10');
    await ensureMonth(db, f.userId, '2026-11');
    const v = (await getMonthView(db, f.userId, '2026-11'))!;
    expect(v.funds).toEqual([{ id: f.fundId, name: 'Regalos', allocatedCents: 5000, balanceCents: 10000 }]);
  });
});
