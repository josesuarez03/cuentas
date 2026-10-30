// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { pushSupport, subscribeThisDevice, unsubscribeThisDevice, urlBase64ToUint8Array } from './push-client';

const g = globalThis as Record<string, unknown>;
afterEach(() => { delete g.PushManager; delete g.Notification; Reflect.deleteProperty(navigator, 'serviceWorker'); });

function fakeBrowser(permission: NotificationPermission, existing: unknown = null) {
  const sub = { endpoint: 'https://push.example/1', toJSON: () => ({ endpoint: 'https://push.example/1', keys: { p256dh: 'p', auth: 'a' } }), unsubscribe: vi.fn().mockResolvedValue(true) };
  const pushManager = { getSubscription: vi.fn().mockResolvedValue(existing), subscribe: vi.fn().mockResolvedValue(sub) };
  const reg = { pushManager };
  g.PushManager = function PushManager() {};
  g.Notification = { requestPermission: vi.fn().mockResolvedValue(permission) };
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { register: vi.fn().mockResolvedValue(reg), ready: Promise.resolve(reg), getRegistration: vi.fn().mockResolvedValue(reg) },
  });
  return { sub, pushManager };
}

describe('push-client', () => {
  it('sin PushManager (iPhone sin instalar): no soportado', () => {
    expect(pushSupport()).toBe('unsupported');
  });
  it('clave base64url → 65 bytes', () => {
    const key = 'B'.padEnd(87, 'A');
    expect(urlBase64ToUint8Array(key)).toBeInstanceOf(Uint8Array);
    expect(urlBase64ToUint8Array(key).length).toBe(65);
  });
  it('permiso denegado: no registra nada', async () => {
    fakeBrowser('denied');
    expect(await subscribeThisDevice('B'.padEnd(87, 'A'))).toBe('denied');
    expect((navigator.serviceWorker.register as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
  });
  it('permiso concedido: registra /serwist/sw.js y se suscribe con userVisibleOnly', async () => {
    const { pushManager } = fakeBrowser('granted');
    expect(await subscribeThisDevice('B'.padEnd(87, 'A'))).toEqual({ endpoint: 'https://push.example/1', keys: { p256dh: 'p', auth: 'a' } });
    expect(navigator.serviceWorker.register).toHaveBeenCalledWith('/serwist/sw.js', { scope: '/' });
    expect(pushManager.subscribe.mock.calls[0][0].userVisibleOnly).toBe(true);
  });
  it('baja: devuelve el endpoint', async () => {
    const { sub } = fakeBrowser('granted');
    const { pushManager } = fakeBrowser('granted', sub);
    expect(await unsubscribeThisDevice()).toBe('https://push.example/1');
    expect(sub.unsubscribe).toHaveBeenCalled();
    expect(pushManager.subscribe).not.toHaveBeenCalled();
  });
});
