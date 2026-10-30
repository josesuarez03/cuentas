import { and, eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import * as s from '@/db/schema';
import type { Db } from '@/db/types';
import { createTestDb } from '@/test/db';
import { createFixture, type Fixture } from '@/test/fixtures';
import { ClosedMonthError, NotFoundError, updateEntryAmount } from './entries';
import { closeMonth, reopenMonth, rollMonth } from './lifecycle';
import { ensureMonth, findMonth } from './months';

let db: Db;
let f: Fixture;
beforeEach(async () => { db = await createTestDb(); f = await createFixture(db); });
const statusOf = async (ym: string, userId = f.userId) => (await findMonth(db, userId, ym))?.status ?? null;

describe('rollMonth', () => {
  it('crea el mes nuevo y cierra el anterior', async () => {
    await ensureMonth(db, f.userId, '2026-10');
    expect(await rollMonth(db, f.userId, '2026-11')).toEqual({ created: true, closed: ['2026-10'] });
    expect(await statusOf('2026-10')).toBe('closed');
    expect(await statusOf('2026-11')).toBe('open');
  });
  it('es idempotente', async () => {
    await ensureMonth(db, f.userId, '2026-10');
    await rollMonth(db, f.userId, '2026-11');
    expect(await rollMonth(db, f.userId, '2026-11')).toEqual({ created: false, closed: [] });
    expect((await db.select().from(s.months).where(eq(s.months.userId, f.userId))).length).toBe(2);
  });
  it('dos ejecuciones a la vez dejan un solo mes', async () => {
    await Promise.all([rollMonth(db, f.userId, '2026-11'), rollMonth(db, f.userId, '2026-11')]);
    expect((await db.select().from(s.months).where(and(eq(s.months.userId, f.userId), eq(s.months.yearMonth, '2026-11')))).length).toBe(1);
  });
  it('se pone al día si el cron no corrió varios meses', async () => {
    await ensureMonth(db, f.userId, '2026-09');
    await ensureMonth(db, f.userId, '2026-10');
    expect((await rollMonth(db, f.userId, '2026-12')).closed.sort()).toEqual(['2026-09', '2026-10']);
  });
  it('no vuelve a cerrar un mes reabierto', async () => {
    await ensureMonth(db, f.userId, '2026-10');
    await rollMonth(db, f.userId, '2026-11');
    await reopenMonth(db, f.userId, '2026-10', '2026-11');
    expect(await rollMonth(db, f.userId, '2026-11')).toEqual({ created: false, closed: [] });
    expect(await statusOf('2026-10')).toBe('open');
  });
  it('no toca los meses de otro usuario', async () => {
    await createFixture(db, 'u2');
    await ensureMonth(db, 'u2', '2026-10');
    await rollMonth(db, f.userId, '2026-11');
    expect(await statusOf('2026-10', 'u2')).toBe('open');
  });
  it('un mes cerrado es de solo lectura (5.7)', async () => {
    const id = await ensureMonth(db, f.userId, '2026-10');
    await rollMonth(db, f.userId, '2026-11');
    const [gas] = await db.select().from(s.entries).where(and(eq(s.entries.monthId, id), eq(s.entries.recurringItemId, f.items.gas)));
    await expect(updateEntryAmount(db, f.userId, gas.id, 3000)).rejects.toBeInstanceOf(ClosedMonthError);
  });
});

describe('reabrir y cerrar a mano', () => {
  it('reabrir deja editar; cerrar vuelve a bloquear', async () => {
    await ensureMonth(db, f.userId, '2026-10');
    await rollMonth(db, f.userId, '2026-11');
    await reopenMonth(db, f.userId, '2026-10', '2026-11');
    expect((await findMonth(db, f.userId, '2026-10'))!.reopenedAt).toBeInstanceOf(Date);
    await closeMonth(db, f.userId, '2026-10', '2026-11');
    expect(await statusOf('2026-10')).toBe('closed');
  });
  it('el mes actual no se reabre ni se cierra a mano', async () => {
    await ensureMonth(db, f.userId, '2026-11');
    await expect(reopenMonth(db, f.userId, '2026-11', '2026-11')).rejects.toThrow('Solo se pueden reabrir meses pasados.');
    await expect(closeMonth(db, f.userId, '2026-11', '2026-11')).rejects.toThrow('El mes actual se cierra solo al empezar el siguiente.');
  });
  it('meses de otro usuario: no encontrado', async () => {
    await createFixture(db, 'u2');
    await ensureMonth(db, 'u2', '2026-10');
    await expect(reopenMonth(db, f.userId, '2026-10', '2026-11')).rejects.toBeInstanceOf(NotFoundError);
  });
});
