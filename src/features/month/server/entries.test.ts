import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import * as s from '@/db/schema';
import type { Db } from '@/db/types';
import { createTestDb } from '@/test/db';
import { createFixture, type Fixture } from '@/test/fixtures';
import { getCatalog } from '@/features/catalog/server/catalog';
import { addOneOffEntry, ClosedMonthError, confirmIncome, NotFoundError, setSavingsSplit, updateEntryAmount } from './entries';
import { ensureMonth, getMonthView } from './months';

let db: Db;
let f: Fixture;
let monthId: string;

beforeEach(async () => {
  db = await createTestDb();
  f = await createFixture(db);
  monthId = await ensureMonth(db, f.userId, '2026-10');
});

const gasEntry = async () => {
  const rows = await db.select().from(s.entries).where(eq(s.entries.monthId, monthId));
  return rows.find((r) => r.name === 'Gas')!;
};

const nominaEntry = async () => {
  const rows = await db.select().from(s.entries).where(eq(s.entries.monthId, monthId));
  return rows.find((r) => r.name === 'Nómina')!;
};

describe('confirmIncome', () => {
  it('guarda cuándo se confirmó', async () => {
    const before = Date.now();
    await confirmIncome(db, f.userId, (await nominaEntry()).id);
    const at = (await nominaEntry()).confirmedAt;
    expect(at).toBeInstanceOf(Date);
    expect(at!.getTime()).toBeGreaterThanOrEqual(before - 1000);
  });

  it('pasa el ingreso a confirmado', async () => {
    await confirmIncome(db, f.userId, (await nominaEntry()).id);
    expect((await nominaEntry()).status).toBe('confirmed');
    const v = (await getMonthView(db, f.userId, '2026-10'))!;
    const nomina = v.categories.flatMap((c) => c.entries).find((e) => e.name === 'Nómina')!;
    expect(nomina.note.startsWith('Pendiente')).toBe(false);
  });
  it('confirmar dos veces no falla', async () => {
    const id = (await nominaEntry()).id;
    await confirmIncome(db, f.userId, id);
    await expect(confirmIncome(db, f.userId, id)).resolves.toBeUndefined();
    expect((await nominaEntry()).status).toBe('confirmed');
  });
  it('no deja confirmar ingresos de otro usuario', async () => {
    await createFixture(db, 'u2');
    await expect(confirmIncome(db, 'u2', (await nominaEntry()).id)).rejects.toBeInstanceOf(NotFoundError);
    expect((await nominaEntry()).status).toBe('pending');
  });
  it('no confirma un gasto', async () => {
    await expect(confirmIncome(db, f.userId, (await gasEntry()).id)).rejects.toBeInstanceOf(NotFoundError);
  });
  it('no deja tocar un mes cerrado', async () => {
    await db.update(s.months).set({ status: 'closed' }).where(eq(s.months.id, monthId));
    await expect(confirmIncome(db, f.userId, (await nominaEntry()).id)).rejects.toBeInstanceOf(ClosedMonthError);
  });
});

describe('updateEntryAmount', () => {
  it('cambia el importe', async () => {
    await updateEntryAmount(db, f.userId, (await gasEntry()).id, 3100);
    expect((await gasEntry()).amountCents).toBe(3100);
  });
  it('no deja tocar partidas de otro usuario', async () => {
    await createFixture(db, 'u2');
    await expect(updateEntryAmount(db, 'u2', (await gasEntry()).id, 1)).rejects.toBeInstanceOf(NotFoundError);
  });
  it('no deja tocar un mes cerrado', async () => {
    await db.update(s.months).set({ status: 'closed' }).where(eq(s.months.id, monthId));
    await expect(updateEntryAmount(db, f.userId, (await gasEntry()).id, 1)).rejects.toBeInstanceOf(ClosedMonthError);
  });
  it('rechaza importes no enteros o negativos', async () => {
    await expect(updateEntryAmount(db, f.userId, (await gasEntry()).id, -1)).rejects.toBeInstanceOf(RangeError);
  });
});

describe('addOneOffEntry', () => {
  it('un ingreso puntual nace confirmado y con fecha; un gasto sin fecha de confirmación', async () => {
    const income = await addOneOffEntry(db, f.userId, { yearMonth: '2026-10', kind: 'income', name: 'Bizum', categoryId: f.categories.ingresos, accountId: f.accounts.principal, amountCents: 2000 });
    const expense = await addOneOffEntry(db, f.userId, { yearMonth: '2026-10', kind: 'expense', name: 'Cena', categoryId: f.categories.piso, accountId: f.accounts.principal, amountCents: 3000 });
    const rows = await db.select().from(s.entries);
    expect(rows.find((r) => r.id === income)!.confirmedAt).toBeInstanceOf(Date);
    expect(rows.find((r) => r.id === expense)!.confirmedAt).toBeNull();
  });

  it('añade una partida puntual al mes', async () => {
    await addOneOffEntry(db, f.userId, {
      yearMonth: '2026-10', kind: 'expense', name: 'Regalo cumpleaños',
      categoryId: f.categories.piso, accountId: f.accounts.principal, amountCents: 3500,
    });
    const v = (await getMonthView(db, f.userId, '2026-10'))!;
    const piso = v.categories.find((c) => c.name === 'Piso')!;
    expect(piso.entries.find((e) => e.name === 'Regalo cumpleaños')!.note).toBe('Puntual · BBVA principal');
  });
  it('no acepta categorías de otro usuario', async () => {
    const other = await createFixture(db, 'u2');
    await expect(addOneOffEntry(db, f.userId, {
      yearMonth: '2026-10', kind: 'expense', name: 'X',
      categoryId: other.categories.piso, accountId: f.accounts.principal, amountCents: 100,
    })).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('setSavingsSplit', () => {
  it('guarda un nuevo reparto', async () => {
    await setSavingsSplit(db, f.userId, '2026-10', [
      { accountId: f.accounts.trade, percent: 50 },
      { accountId: f.accounts.ahorro, percent: 50 },
      { accountId: f.accounts.principal, percent: 0 },
    ]);
    const v = (await getMonthView(db, f.userId, '2026-10'))!;
    expect(v.split.map((x) => x.percent)).toEqual([50, 50]);
  });
  it('exige que sume 100', async () => {
    await expect(setSavingsSplit(db, f.userId, '2026-10', [{ accountId: f.accounts.trade, percent: 90 }]))
      .rejects.toThrow('El reparto debe sumar 100 %');
  });
});

describe('getCatalog', () => {
  it('lista categorías principales y cuentas del usuario', async () => {
    const c = await getCatalog(db, f.userId);
    expect(c.categories.map((x) => x.name)).toEqual(['Ingresos', 'Piso', 'Suscripciones', 'Tarjeta']);
    expect(c.accounts.map((x) => x.name)).toEqual(['BBVA ahorro', 'BBVA principal', 'Trade']);
  });
});
