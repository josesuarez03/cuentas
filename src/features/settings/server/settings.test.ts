import { beforeEach, describe, expect, it } from 'vitest';
import * as s from '@/db/schema';
import type { Db } from '@/db/types';
import { createTestDb } from '@/test/db';
import { createFixture, type Fixture } from '@/test/fixtures';
import { getPreferences, getSettings, updatePreferences } from './settings';

let db: Db;
let f: Fixture;

beforeEach(async () => {
  db = await createTestDb();
  f = await createFixture(db);
});

describe('getSettings', () => {
  it('lee todo lo del usuario con cuotas restantes y etiqueta de subcategoría', async () => {
    const [luz] = await db.insert(s.categories).values({ userId: f.userId, name: 'Luz', kind: 'expense', parentId: f.categories.piso }).returning();
    await db.insert(s.recurringItems).values({ userId: f.userId, name: 'Luz', kind: 'expense', categoryId: luz.id, accountId: f.accounts.principal, amountCents: 4500, frequency: 'monthly', startMonth: '2026-10' });
    await createFixture(db, 'u2');
    const v = await getSettings(db, f.userId, '2026-12');
    expect(v.accounts).toHaveLength(3);
    expect(v.recurring.find((r) => r.name === 'Portátil')).toMatchObject({ currentInstallment: 3, remainingInstallments: 3 });
    expect(v.recurring.find((r) => r.name === 'Luz')!.categoryLabel).toBe('Piso › Luz');
    expect(v.funds[0]).toMatchObject({ name: 'Regalos', balanceCents: 0 });
    expect(v.preferences).toEqual({ emailNotifications: true, pushNotifications: false });
  });

  it('crea las preferencias al leerlas y guarda los cambios solo para ese usuario', async () => {
    const other = await createFixture(db, 'u2');
    expect(await getPreferences(db, f.userId)).toEqual({ emailNotifications: true, pushNotifications: false });
    expect(await getPreferences(db, f.userId)).toEqual({ emailNotifications: true, pushNotifications: false });
    await updatePreferences(db, f.userId, { emailNotifications: false });
    expect(await getPreferences(db, f.userId)).toEqual({ emailNotifications: false, pushNotifications: false });
    expect(await getPreferences(db, other.userId)).toEqual({ emailNotifications: true, pushNotifications: false });
    expect(await db.select().from(s.userSettings)).toHaveLength(2);
  });
});
