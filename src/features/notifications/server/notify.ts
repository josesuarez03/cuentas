import { eq } from 'drizzle-orm';
import * as s from '@/db/schema';
import type { Db } from '@/db/types';
import { pendingPaydays } from '@/features/month/server/payday';
import { getPreferences } from '@/features/settings/server/settings';
import type { IsoDate } from '@/lib/iso-date';
import type { YearMonth } from '@/lib/year-month';
import { duePaydayReminders } from '../domain/due';
import { confirmUrl, paydayEmail, paydayPush, type EmailMessage, type PushPayload } from '../domain/messages';
import type { PushOutcome, PushTarget } from './push';
import { deleteSubscriptionByEndpoint, listSubscriptions } from './subscriptions';

export interface Senders {
  email: (to: string, msg: EmailMessage) => Promise<boolean>;
  push: (t: PushTarget, p: PushPayload) => Promise<PushOutcome>;
}

export async function notifyUser(db: Db, user: { id: string; email: string }, today: IsoDate, ym: YearMonth, opts: {
  region: string; baseUrl: string; senders: Senders;
}) {
  const result = { sent: 0, skipped: 0, failed: 0 };
  const prefs = await getPreferences(db, user.id);
  if (!prefs.emailNotifications && !prefs.pushNotifications) return result;
  const due = duePaydayReminders(await pendingPaydays(db, user.id, ym, opts.region), today);
  for (const r of due) {
    const [claim] = await db.insert(s.notificationsLog).values({ userId: user.id, kind: r.kind, refKey: r.refKey })
      .onConflictDoNothing().returning({ id: s.notificationsLog.id });
    if (!claim) { result.skipped++; continue; }
    const release = () => db.delete(s.notificationsLog).where(eq(s.notificationsLog.id, claim.id));
    const url = confirmUrl(opts.baseUrl, r.yearMonth, r.entryId);
    let delivered = false;
    try {
      if (prefs.emailNotifications) delivered = (await opts.senders.email(user.email, paydayEmail(r, url))) || delivered;
      if (prefs.pushNotifications) {
        for (const t of await listSubscriptions(db, user.id)) {
          const outcome = await opts.senders.push(t, paydayPush(r, url));
          if (outcome === 'gone') await deleteSubscriptionByEndpoint(db, t.endpoint);
          if (outcome === 'sent') delivered = true;
        }
      }
    } catch (error) {
      await release();   // un fallo inesperado no deja el aviso «gastado»
      throw error;
    }
    if (delivered) result.sent++;
    else { await release(); result.failed++; }
  }
  return result;
}
