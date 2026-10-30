import { beforeEach, describe, expect, it } from 'vitest';
import * as s from '@/db/schema';
import type { Db } from '@/db/types';
import { createTestDb } from '@/test/db';
import { createFixture } from '@/test/fixtures';
import { deleteSubscriptionByEndpoint, listSubscriptions, removeSubscription, saveSubscription } from './subscriptions';

let db: Db;
beforeEach(async () => { db = await createTestDb(); await createFixture(db, 'u1'); await createFixture(db, 'u2'); });
const t1 = { endpoint: 'https://push.example/1', p256dh: 'p1', auth: 'a1' };

describe('suscripciones', () => {
  it('guardar dos veces el mismo endpoint actualiza las claves, no duplica', async () => {
    await saveSubscription(db, 'u1', t1);
    await saveSubscription(db, 'u1', { ...t1, p256dh: 'p1b' });
    expect(await listSubscriptions(db, 'u1')).toEqual([{ ...t1, p256dh: 'p1b' }]);
  });
  it('quitar solo borra las propias y dice cuántas quedan', async () => {
    await saveSubscription(db, 'u1', t1);
    await saveSubscription(db, 'u1', { ...t1, endpoint: 'https://push.example/2' });
    expect(await removeSubscription(db, 'u2', t1.endpoint)).toBe(0);
    expect((await listSubscriptions(db, 'u1')).length).toBe(2);
    expect(await removeSubscription(db, 'u1', t1.endpoint)).toBe(1);
  });
  it('borrar por endpoint (suscripción caducada)', async () => {
    await saveSubscription(db, 'u1', t1);
    await deleteSubscriptionByEndpoint(db, t1.endpoint);
    expect(await db.select().from(s.pushSubscriptions)).toEqual([]);
  });
});
