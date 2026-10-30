import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import * as s from '@/db/schema';
import type { Db } from '@/db/types';
import { createTestDb } from '@/test/db';
import { createFixture, type Fixture } from '@/test/fixtures';
import { NotFoundError } from '@/features/month/server/entries';
import { ensureMonth, getMonthView } from '@/features/month/server/months';
import type { RecurringInput } from '../domain/recurring-schema';
import {
  createFund, createPocket, createRecurring, setRecurringActive, updateFund, updatePocket, updateRecurring,
} from './templates';

let db: Db;
let f: Fixture;

beforeEach(async () => {
  db = await createTestDb();
  f = await createFixture(db);
});

const input = (over: Partial<RecurringInput> = {}): RecurringInput => ({
  name: 'Alquiler', kind: 'expense', categoryId: f.categories.piso, accountId: f.accounts.principal,
  amountCents: 10000, frequency: 'monthly', startMonth: '2026-10', anchorMonth: null, installmentsTotal: null, paydayDay: null,
  ...over,
});

const entriesOf = async (ym: string) => (await getMonthView(db, f.userId, ym))!.categories.flatMap((c) => c.entries);

describe('recurrentes', () => {
  it('crea una partida que aparece al generar el mes siguiente; guarda solo los campos de su frecuencia', async () => {
    const id = await createRecurring(db, f.userId, { ...input(), name: 'Luz', amountCents: 4500, anchorMonth: 5, paydayDay: 3 });
    const [row] = await db.select().from(s.recurringItems).where(eq(s.recurringItems.id, id));
    expect(row).toMatchObject({ anchorMonth: null, installmentsTotal: null, paydayDay: null });
    await ensureMonth(db, f.userId, '2026-10');
    expect((await entriesOf('2026-10')).some((e) => e.name === 'Luz')).toBe(true);
  });
  it('editar el importe cambia también el mes abierto (y así lo hereda el siguiente)', async () => {
    await ensureMonth(db, f.userId, '2026-10');
    await updateRecurring(db, f.userId, f.items.nomina, { ...input(), name: 'Nómina', kind: 'income', categoryId: f.categories.ingresos, amountCents: 179000, paydayDay: 27 }, '2026-10');
    const oct = (await entriesOf('2026-10')).find((e) => e.name === 'Nómina')!;
    expect(oct.amountCents).toBe(179000);
    await ensureMonth(db, f.userId, '2026-11');
    const nov = (await entriesOf('2026-11')).find((e) => e.name === 'Nómina')!;
    expect(nov.amountCents).toBe(179000);
  });
  it('desactivar deja fuera la partida de los meses nuevos', async () => {
    await setRecurringActive(db, f.userId, f.items.nomina, false);
    await ensureMonth(db, f.userId, '2026-10');
    expect((await entriesOf('2026-10')).some((e) => e.name === 'Nómina')).toBe(false);
  });
  it('rechaza categoría de otro tipo, cuenta ajena y partidas ajenas', async () => {
    await expect(createRecurring(db, f.userId, { ...input(), categoryId: f.categories.ingresos })).rejects.toThrow('La categoría debe ser de gasto.');
    const other = await createFixture(db, 'u2');
    await expect(createRecurring(db, f.userId, { ...input(), accountId: other.accounts.principal })).rejects.toThrow(NotFoundError);
    await expect(setRecurringActive(db, f.userId, other.items.nomina, false)).rejects.toThrow(NotFoundError);
  });
});

describe('bolsas y huchas', () => {
  it('crear una bolsa la añade al mes abierto', async () => {
    await ensureMonth(db, f.userId, '2026-10');
    await createPocket(db, f.userId, { name: 'Viajes', accountId: f.accounts.principal, monthlyLimitCents: 20000 }, '2026-10');
    expect((await getMonthView(db, f.userId, '2026-10'))!.pockets.map((p) => p.name)).toEqual(['Ocio', 'Viajes']);
  });
  it('editar el límite cambia el del mes abierto y la plantilla', async () => {
    await ensureMonth(db, f.userId, '2026-10');
    await updatePocket(db, f.userId, f.pocketId, { name: 'Ocio', accountId: f.accounts.principal, monthlyLimitCents: 18000 }, '2026-10');
    expect((await getMonthView(db, f.userId, '2026-10'))!.pockets[0].limitCents).toBe(18000);
    await ensureMonth(db, f.userId, '2026-11');
    expect((await getMonthView(db, f.userId, '2026-11'))!.pockets[0].limitCents).toBe(18000);
  });
  it('crea y edita huchas; la aportación vale para los meses nuevos', async () => {
    const id = await createFund(db, f.userId, { name: 'Coche', accountId: f.accounts.ahorro, monthlyAllocationCents: 3000 });
    await updateFund(db, f.userId, id, { name: 'Coche', accountId: f.accounts.ahorro, monthlyAllocationCents: 4000 });
    await ensureMonth(db, f.userId, '2026-10');
    expect((await getMonthView(db, f.userId, '2026-10'))!.funds.find((x) => x.name === 'Coche')!.allocatedCents).toBe(4000);
  });
  it('no toca bolsas ni huchas ajenas', async () => {
    const other = await createFixture(db, 'u2');
    await expect(updatePocket(db, f.userId, other.pocketId, { name: 'X', accountId: f.accounts.principal, monthlyLimitCents: 1 })).rejects.toThrow(NotFoundError);
    await expect(updateFund(db, f.userId, other.fundId, { name: 'X', accountId: f.accounts.principal, monthlyAllocationCents: 1 })).rejects.toThrow(NotFoundError);
  });
});
