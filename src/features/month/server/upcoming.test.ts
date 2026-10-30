import { and, eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import * as s from '@/db/schema';
import type { Db } from '@/db/types';
import { createTestDb } from '@/test/db';
import { createFixture, type Fixture } from '@/test/fixtures';
import { ensureMonth } from './months';
import { getUpcoming } from './upcoming';

let db: Db;
let f: Fixture;

beforeEach(async () => {
  db = await createTestDb();
  f = await createFixture(db);
});

describe('getUpcoming', () => {
  it('hereda el último importe registrado', async () => {
    const oct = await ensureMonth(db, f.userId, '2026-10');
    await db.update(s.entries).set({ amountCents: 3100 })
      .where(and(eq(s.entries.monthId, oct), eq(s.entries.recurringItemId, f.items.gas)));
    const up = await getUpcoming(db, f.userId, '2026-12');
    expect(up.items).toEqual([
      { id: f.items.gas, name: 'Gas', note: 'cada 2 meses', signedCents: -3100 },
      { id: f.items.portatil, name: 'Portátil', note: 'cuota 3 de 6', signedCents: -10000 },
    ]);
    expect(up.totalCents).toBe(-13100);
  });
  it('solo mira la plantilla del usuario', async () => {
    await createFixture(db, 'u2');
    const up = await getUpcoming(db, f.userId, '2026-11');
    expect(up.items).toEqual([{ id: f.items.portatil, name: 'Portátil', note: 'cuota 2 de 6', signedCents: -10000 }]);
  });
});
