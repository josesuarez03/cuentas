import { afterEach, describe, expect, it, vi } from 'vitest';

const { sendNotification, setVapidDetails } = vi.hoisted(() => ({ sendNotification: vi.fn(), setVapidDetails: vi.fn() }));
vi.mock('web-push', () => ({ default: { sendNotification, setVapidDetails } }));
const { sendPush } = await import('./push');
const target = { endpoint: 'https://push.example/1', p256dh: 'p', auth: 'a' };
const payload = { title: 'T', body: 'B', url: 'https://k/mes/2026-12?confirmar=e1', tag: 'payday:e1' };

afterEach(() => { vi.unstubAllEnvs(); sendNotification.mockReset(); });
const keys = () => { vi.stubEnv('VAPID_PUBLIC_KEY', 'pub'); vi.stubEnv('VAPID_PRIVATE_KEY', 'priv'); vi.stubEnv('VAPID_SUBJECT', 'mailto:j@x.es'); };

describe('sendPush', () => {
  it('sin claves VAPID: failed sin llamar', async () => {
    vi.stubEnv('VAPID_PRIVATE_KEY', '');
    expect(await sendPush(target, payload)).toBe('failed');
    expect(sendNotification).not.toHaveBeenCalled();
  });
  it('envía el JSON con TTL de un día', async () => {
    keys();
    sendNotification.mockResolvedValue({ statusCode: 201 });
    expect(await sendPush(target, payload)).toBe('sent');
    expect(setVapidDetails).toHaveBeenCalledWith('mailto:j@x.es', 'pub', 'priv');
    expect(sendNotification).toHaveBeenCalledWith(
      { endpoint: target.endpoint, keys: { p256dh: 'p', auth: 'a' } }, JSON.stringify(payload), { TTL: 86_400 },
    );
  });
  it('404 y 410 → gone; otros → failed', async () => {
    keys();
    sendNotification
      .mockRejectedValueOnce(Object.assign(new Error('x'), { statusCode: 410 }))
      .mockRejectedValueOnce(Object.assign(new Error('x'), { statusCode: 404 }))
      .mockRejectedValueOnce(Object.assign(new Error('x'), { statusCode: 500 }));
    expect(await sendPush(target, payload)).toBe('gone');
    expect(await sendPush(target, payload)).toBe('gone');
    expect(await sendPush(target, payload)).toBe('failed');
  });
});
