'use server';

import { z } from 'zod';
import { db } from '@/db';
import { requireUser } from '@/features/auth/session';
import { toResult, type ActionResult } from '@/features/month/server/action-result';
import { updatePreferences } from '@/features/settings/server/settings';
import { listSubscriptions, removeSubscription, saveSubscription } from './subscriptions';

const subscribeSchema = z.object({
  endpoint: z.url().startsWith('https://').max(2000),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(200) }),
});
const endpointSchema = z.string().max(2000).nullable();

export async function subscribePushAction(
  sub: { endpoint: string; keys: { p256dh: string; auth: string } },
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = subscribeSchema.safeParse(sub);
  if (!parsed.success) return { ok: false, error: 'Suscripción no válida.' };
  try {
    const { endpoint, keys } = parsed.data;
    await saveSubscription(db, user.id, { endpoint, p256dh: keys.p256dh, auth: keys.auth });
    await updatePreferences(db, user.id, { pushNotifications: true });
    return { ok: true };
  } catch (error) {
    return toResult(error);
  }
}

export async function unsubscribePushAction(endpoint: string | null): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = endpointSchema.safeParse(endpoint);
  if (!parsed.success) return { ok: false, error: 'Suscripción no válida.' };
  try {
    const left = parsed.data
      ? await removeSubscription(db, user.id, parsed.data)
      : (await listSubscriptions(db, user.id)).length;
    if (left === 0) await updatePreferences(db, user.id, { pushNotifications: false });
    return { ok: true };
  } catch (error) {
    return toResult(error);
  }
}
