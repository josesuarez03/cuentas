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

it('crea saldos, préstamos y preferencias y borra en cascada los saldos de una cuenta', async () => {
  const db = await createTestDb();
  const f = await createFixture(db);
  await db.insert(s.balanceSnapshots).values({ accountId: f.accounts.principal, balanceCents: 230000 });
  const [m] = await db.insert(s.months).values({ userId: f.userId, yearMonth: '2026-10' }).returning();
  await db.insert(s.loans).values({ userId: f.userId, person: 'Juan', amountCents: 20000, accountId: f.accounts.principal, lentMonthId: m.id });
  await db.insert(s.userSettings).values({ userId: f.userId });

  const [prefs] = await db.select().from(s.userSettings).where(eq(s.userSettings.userId, f.userId));
  expect(prefs).toMatchObject({ timezone: 'Europe/Madrid', holidayRegion: 'ES-MD', emailNotifications: true, pushNotifications: false });
  const [loan] = await db.select().from(s.loans);
  expect(loan.repaidMonthId).toBeNull();

  const [extra] = await db.insert(s.bankAccounts).values({ userId: f.userId, name: 'Vieja', bank: 'X', type: 'savings' }).returning();
  await db.insert(s.balanceSnapshots).values({ accountId: extra.id, balanceCents: 1 });
  await db.delete(s.bankAccounts).where(eq(s.bankAccounts.id, extra.id));
  expect((await db.select().from(s.balanceSnapshots)).map((x) => x.accountId)).toEqual([f.accounts.principal]);
});

it('suscripciones push, registro de avisos con ref_key único y meses reabiertos', async () => {
  const db = await createTestDb();
  const f = await createFixture(db);
  await db.insert(s.pushSubscriptions).values({ userId: f.userId, endpoint: 'https://push.example/1', p256dh: 'p', auth: 'a' });
  await expect(
    db.insert(s.pushSubscriptions).values({ userId: f.userId, endpoint: 'https://push.example/1', p256dh: 'p2', auth: 'a2' }),
  ).rejects.toThrow();

  await db.insert(s.notificationsLog).values({ userId: f.userId, kind: 'payday', refKey: 'payday:x:2026-12:1' });
  const dup = await db.insert(s.notificationsLog).values({ userId: f.userId, kind: 'payday', refKey: 'payday:x:2026-12:1' })
    .onConflictDoNothing().returning();
  expect(dup).toEqual([]);

  const [m] = await db.insert(s.months).values({ userId: f.userId, yearMonth: '2026-10' }).returning();
  expect(m.reopenedAt).toBeNull();

  await db.delete(s.user).where(eq(s.user.id, f.userId));
  expect(await db.select().from(s.pushSubscriptions)).toEqual([]);
  expect(await db.select().from(s.notificationsLog)).toEqual([]);
});
