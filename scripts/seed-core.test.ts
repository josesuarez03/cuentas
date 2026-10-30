import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import * as s from '@/db/schema';
import type { Db } from '@/db/types';
import { ensureMonth, getMonthView } from '@/features/month/server/months';
import { createTestDb } from '@/test/db';
import { seedData } from './seed-data';
import { seedOwner, validate, type SeedData } from './seed-core';

const filled: SeedData = {
  ...seedData,
  items: seedData.items.map((i) => ({ ...i, euros: i.euros || 10, anchorMonth: i.frequency === 'annual' ? 3 : i.anchorMonth })),
  pockets: seedData.pockets.map((p) => ({ ...p, euros: p.euros || 100 })),
};

let db: Db;
beforeEach(async () => {
  db = await createTestDb();
  await db.insert(s.user).values({ id: 'u1', name: 'Jose', email: 'u1@example.com' });
});

describe('seedOwner', () => {
  it('regenera el mes actual que se creó vacío antes de sembrar', async () => {
    await ensureMonth(db, 'u1', '2026-10');
    expect((await getMonthView(db, 'u1', '2026-10'))!.categories.flatMap((c) => c.entries)).toHaveLength(0);

    await seedOwner(db, 'u1', filled, '2026-10');
    await ensureMonth(db, 'u1', '2026-10');

    const view = await getMonthView(db, 'u1', '2026-10');
    const names = view!.categories.flatMap((g) => g.entries.map((e) => e.name));
    expect(names).toContain('Nómina');
    expect(await db.select().from(s.months).where(eq(s.months.userId, 'u1'))).toHaveLength(1);
  });

  it('guarda la regla de cobro y el saldo de hoy (la tarjeta en negativo)', async () => {
    const data: SeedData = {
      ...filled,
      accounts: filled.accounts.map((a) => ({ ...a, balanceEuros: a.key === 'principal' ? 1234.5 : a.key === 'tarjeta' ? 200 : undefined })),
      items: filled.items.map((i) => (i.name === 'Nómina' ? { ...i, paydayDay: 28, paydayRule: 'after' as const } : i)),
    };
    await seedOwner(db, 'u1', data, '2026-10');

    const [nomina] = await db.select().from(s.recurringItems).where(eq(s.recurringItems.name, 'Nómina'));
    expect(nomina).toMatchObject({ paydayDay: 28, paydayRule: 'after' });
    const snaps = await db.select({ name: s.bankAccounts.name, cents: s.balanceSnapshots.balanceCents })
      .from(s.balanceSnapshots).innerJoin(s.bankAccounts, eq(s.bankAccounts.id, s.balanceSnapshots.accountId));
    expect(snaps.sort((a, b) => a.name.localeCompare(b.name))).toEqual([
      { name: 'BBVA principal', cents: 123450 },
      { name: 'Tarjeta BBVA', cents: -20000 },
    ]);
  });

  it('no siembra dos veces', async () => {
    await seedOwner(db, 'u1', filled, '2026-10');
    await expect(seedOwner(db, 'u1', filled, '2026-10')).rejects.toThrow('ya tiene datos');
  });
});

describe('validate', () => {
  it('rechaza importes no finitos y referencias inexistentes', () => {
    const bad = {
      ...filled,
      items: [{ ...filled.items[0], euros: NaN, category: 'Nada' }, { ...filled.items[1], account: 'zzz' as never }],
      funds: [{ name: 'F', account: 'ahorro' as const, euros: Infinity }],
      accounts: filled.accounts.map((a, i) => (i === 0 ? { ...a, balanceEuros: NaN } : a)),
    } as SeedData;
    expect(() => validate(bad)).toThrow(/falta el importe[\s\S]*categoría «Nada»[\s\S]*cuenta «zzz»[\s\S]*Fondo F[\s\S]*Cuenta BBVA principal: saldo/);
  });
});
