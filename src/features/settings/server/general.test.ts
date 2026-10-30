import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import * as s from '@/db/schema';
import type { Db } from '@/db/types';
import { createTestDb } from '@/test/db';
import { createFixture, type Fixture } from '@/test/fixtures';
import { NotFoundError } from '@/features/month/server/entries';
import { ensureMonth, findMonth, getMonthView } from '@/features/month/server/months';
import { createAccount, createCategory, renameCategory, setDefaultSplit, updateAccount } from './general';
import { getSettings } from './settings';

let db: Db;
let f: Fixture;

beforeEach(async () => {
  db = await createTestDb();
  f = await createFixture(db);
});

describe('cuentas', () => {
  it('crea una cuenta con saldo inicial (snapshot) y la edita', async () => {
    const id = await createAccount(db, f.userId, { name: 'Revolut', bank: 'Revolut', type: 'joint', balanceCents: 12000 });
    expect(await db.select().from(s.balanceSnapshots).where(eq(s.balanceSnapshots.accountId, id))).toHaveLength(1);
    await updateAccount(db, f.userId, id, { name: 'Revolut conjunta', bank: 'Revolut', type: 'joint' });
    expect((await getSettings(db, f.userId)).accounts.find((a) => a.id === id)!.name).toBe('Revolut conjunta');
  });
  it('sin saldo inicial no crea snapshot; no edita cuentas ajenas', async () => {
    const id = await createAccount(db, f.userId, { name: 'X', bank: 'Y', type: 'checking', balanceCents: null });
    expect(await db.select().from(s.balanceSnapshots).where(eq(s.balanceSnapshots.accountId, id))).toHaveLength(0);
    const other = await createFixture(db, 'u2');
    await expect(updateAccount(db, f.userId, other.accounts.principal, { name: 'Z', bank: 'Z', type: 'checking' })).rejects.toThrow(NotFoundError);
  });
});

describe('categorías', () => {
  it('crea subcategorías de un solo nivel y del mismo tipo', async () => {
    const luz = await createCategory(db, f.userId, { name: 'Luz', kind: 'expense', parentId: f.categories.piso });
    await expect(createCategory(db, f.userId, { name: 'Valle', kind: 'expense', parentId: luz })).rejects.toThrow('Solo hay un nivel de subcategorías.');
    await expect(createCategory(db, f.userId, { name: 'Extra', kind: 'income', parentId: f.categories.piso })).rejects.toThrow('La subcategoría debe ser del mismo tipo.');
    const other = await createFixture(db, 'u2');
    await expect(createCategory(db, f.userId, { name: 'X', kind: 'expense', parentId: other.categories.piso })).rejects.toThrow(NotFoundError);
  });
  it('las nuevas van al final y se pueden renombrar', async () => {
    const id = await createCategory(db, f.userId, { name: 'Ocio y compras', kind: 'expense', parentId: null });
    const cats = (await getSettings(db, f.userId)).categories;
    expect(cats.at(-1)!.id).toBe(id);
    await renameCategory(db, f.userId, id, 'Ocio');
    expect((await getSettings(db, f.userId)).categories.find((c) => c.id === id)!.name).toBe('Ocio');
  });
});

describe('setDefaultSplit', () => {
  it('guarda los porcentajes (el resto a 0) y el reparto por defecto cambia también el del mes abierto', async () => {
    await ensureMonth(db, f.userId, '2026-10');
    await setDefaultSplit(db, f.userId, [{ accountId: f.accounts.trade, percent: 70 }, { accountId: f.accounts.ahorro, percent: 30 }], '2026-10');
    const accounts = (await getSettings(db, f.userId)).accounts;
    expect(Object.fromEntries(accounts.map((a) => [a.name, a.defaultSavingsPercent]))).toEqual({ 'BBVA ahorro': 30, 'BBVA principal': 0, Trade: 70 });
    expect((await getMonthView(db, f.userId, '2026-10'))!.split.map((x) => x.percent)).toEqual([70, 30]);
  });
  it('exige que sume 100 y rechaza tarjetas', async () => {
    await expect(setDefaultSplit(db, f.userId, [{ accountId: f.accounts.trade, percent: 90 }])).rejects.toThrow('El reparto debe sumar 100 %');
    const card = await createAccount(db, f.userId, { name: 'Tarjeta', bank: 'BBVA', type: 'credit_card', balanceCents: null });
    await expect(setDefaultSplit(db, f.userId, [{ accountId: card, percent: 100 }])).rejects.toThrow('Esa cuenta no puede recibir ahorro.');
  });
  it('si el mes actual está cerrado o no existe, solo cambia el defecto', async () => {
    await setDefaultSplit(db, f.userId, [{ accountId: f.accounts.trade, percent: 100 }], '2026-10');
    expect(await findMonth(db, f.userId, '2026-10')).toBeNull();
  });
});
