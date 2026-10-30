import { and, asc, count, eq } from 'drizzle-orm';
import * as s from '@/db/schema';
import type { Db } from '@/db/types';
import type { PushTarget } from './push';

export async function saveSubscription(db: Db, userId: string, t: PushTarget): Promise<void> {
  await db.insert(s.pushSubscriptions)
    .values({ userId, endpoint: t.endpoint, p256dh: t.p256dh, auth: t.auth })
    .onConflictDoUpdate({ target: s.pushSubscriptions.endpoint, set: { userId, p256dh: t.p256dh, auth: t.auth } });
}

export async function removeSubscription(db: Db, userId: string, endpoint: string): Promise<number> {
  await db.delete(s.pushSubscriptions)
    .where(and(eq(s.pushSubscriptions.userId, userId), eq(s.pushSubscriptions.endpoint, endpoint)));
  const [row] = await db.select({ n: count() }).from(s.pushSubscriptions).where(eq(s.pushSubscriptions.userId, userId));
  return row?.n ?? 0;
}

export async function listSubscriptions(db: Db, userId: string): Promise<PushTarget[]> {
  return db.select({ endpoint: s.pushSubscriptions.endpoint, p256dh: s.pushSubscriptions.p256dh, auth: s.pushSubscriptions.auth })
    .from(s.pushSubscriptions)
    .where(eq(s.pushSubscriptions.userId, userId))
    .orderBy(asc(s.pushSubscriptions.createdAt));
}

export async function deleteSubscriptionByEndpoint(db: Db, endpoint: string): Promise<void> {
  await db.delete(s.pushSubscriptions).where(eq(s.pushSubscriptions.endpoint, endpoint));
}
