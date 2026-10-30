import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import * as s from '@/db/schema';
import type { Db } from '@/db/types';
import { createTestDb } from '@/test/db';
import { createFixture, type Fixture } from '@/test/fixtures';
import { ensureMonth } from './months';
import { getUserCalendar, pendingPaydays } from './payday';

let db: Db;
let f: Fixture;
beforeEach(async () => { db = await createTestDb(); f = await createFixture(db); });

describe('getUserCalendar', () => {
  it('Madrid por defecto y lo guardado si existe', async () => {
    expect(await getUserCalendar(db, f.userId)).toEqual({ timezone: 'Europe/Madrid', holidayRegion: 'ES-MD' });
    await db.insert(s.userSettings).values({ userId: f.userId, holidayRegion: 'ES' });
    expect((await getUserCalendar(db, f.userId)).holidayRegion).toBe('ES');
  });
});

describe('pendingPaydays', () => {
  it('nómina de diciembre: 27 → jueves 24, con la regla de la partida', async () => {
    const monthId = await ensureMonth(db, f.userId, '2026-12');
    const [entry] = await db.select().from(s.entries).where(eq(s.entries.recurringItemId, f.items.nomina));
    expect(await pendingPaydays(db, f.userId, '2026-12', 'ES-MD')).toEqual([{
      entryId: entry.id, recurringItemId: f.items.nomina, name: 'Nómina', amountCents: 187000, yearMonth: '2026-12', paydayDate: '2026-12-24',
    }]);
    await db.update(s.recurringItems).set({ paydayRule: 'after' }).where(eq(s.recurringItems.id, f.items.nomina));
    expect((await pendingPaydays(db, f.userId, '2026-12', 'ES-MD'))[0].paydayDate).toBe('2026-12-28');
    expect(monthId).toBeTruthy();
  });

  it('sin confirmados, sin partidas sin día de cobro, sin meses cerrados ni de otros usuarios', async () => {
    const monthId = await ensureMonth(db, f.userId, '2026-12');
    await createFixture(db, 'u2');
    await ensureMonth(db, 'u2', '2026-12');
    await db.update(s.entries).set({ status: 'confirmed' }).where(eq(s.entries.recurringItemId, f.items.nomina));
    expect(await pendingPaydays(db, f.userId, '2026-12', 'ES-MD')).toEqual([]);
    await db.update(s.entries).set({ status: 'pending' }).where(eq(s.entries.recurringItemId, f.items.nomina));
    await db.update(s.months).set({ status: 'closed' }).where(eq(s.months.id, monthId));
    expect(await pendingPaydays(db, f.userId, '2026-12', 'ES-MD')).toEqual([]);
  });
});
