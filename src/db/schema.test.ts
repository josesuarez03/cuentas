import { eq } from 'drizzle-orm';
import { expect, it } from 'vitest';
import { createTestDb } from '@/test/db';
import { createFixture } from '@/test/fixtures';
import * as s from './schema';

it('aplica la migración y guarda los datos base', async () => {
  const db = await createTestDb();
  const f = await createFixture(db);
  const items = await db.select().from(s.recurringItems).where(eq(s.recurringItems.userId, f.userId));
  expect(items).toHaveLength(4);
});

it('impide dos meses iguales para el mismo usuario', async () => {
  const db = await createTestDb();
  await createFixture(db);
  await db.insert(s.months).values({ userId: 'u1', yearMonth: '2026-10' });
  await expect(db.insert(s.months).values({ userId: 'u1', yearMonth: '2026-10' })).rejects.toThrow();
});
