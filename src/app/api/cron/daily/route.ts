import { timingSafeEqual } from 'node:crypto';
import { db } from '@/db';
import { runDaily } from '@/features/cron/server/run-daily';
import { sendEmail } from '@/features/notifications/server/email';
import { sendPush } from '@/features/notifications/server/push';

export const dynamic = 'force-dynamic';

function authorized(header: string | null, secret: string | undefined): boolean {
  if (!secret || !header) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  if (!authorized(request.headers.get('authorization'), process.env.CRON_SECRET)) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const summary = await runDaily(db, new Date(), {
    baseUrl: process.env.BETTER_AUTH_URL || new URL(request.url).origin,
    senders: { email: sendEmail, push: sendPush },
  });
  return Response.json(summary, { status: summary.errors > 0 ? 500 : 200 });
}
