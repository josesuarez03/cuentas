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
    } as SeedData;
    expect(() => validate(bad)).toThrow(/falta el importe[\s\S]*categoría «Nada»[\s\S]*cuenta «zzz»[\s\S]*Fondo F/);
  });
});
