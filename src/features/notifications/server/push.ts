import webpush from 'web-push';
import type { PushPayload } from '../domain/messages';

export interface PushTarget { endpoint: string; p256dh: string; auth: string }
export type PushOutcome = 'sent' | 'gone' | 'failed';

export async function sendPush(target: PushTarget, payload: PushPayload): Promise<PushOutcome> {
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!pub || !priv || !subject) {
    console.warn('Push no configurado: faltan claves VAPID.');
    return 'failed';
  }
  try {
    webpush.setVapidDetails(subject, pub, priv);
    await webpush.sendNotification(
      { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
      JSON.stringify(payload),
      { TTL: 86_400 },
    );
    return 'sent';
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) return 'gone';
    console.error(e);
    return 'failed';
  }
}
