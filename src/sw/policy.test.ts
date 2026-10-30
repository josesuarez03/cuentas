import { describe, expect, it } from 'vitest';
import { CACHE, cacheablePage, cachesToDelete, classify, notificationTarget, pushPayload } from './policy';

const O = 'https://kuadrix.app';
const req = (path: string, init: { method?: string; headers?: Record<string, string> } = {}) =>
  ({ url: path.startsWith('http') ? path : O + path, method: init.method ?? 'GET', headers: new Headers(init.headers) });

describe('classify', () => {
  it('lecturas de datos: network-first con copia', () => {
    for (const p of ['/api/months/2026-10', '/api/wealth', '/api/settings']) expect(classify(req(p), O), p).toBe('api-read');
  });
  it('nunca guarda sesión, cron, Server Actions ni otras API', () => {
    for (const r of [
      req('/api/auth/get-session'), req('/api/auth/callback/google?code=x'), req('/api/cron/daily'),
      req('/mes', { method: 'POST', headers: { 'Next-Action': 'abc' } }), req('/api/months/2026-10', { method: 'POST' }),
      req('/api/months/2026-10/x'), req('/api/otra'), req('https://accounts.google.com/o/oauth2/auth'),
    ]) expect(classify(r, O), `${r.method} ${r.url}`).toBe('network-only');
  });
  it('las peticiones RSC van siempre a la red', () => {
    expect(classify(req('/mes?_rsc=abc', { headers: { RSC: '1' } }), O)).toBe('network-only');
  });
  it('pantallas', () => {
    for (const p of ['/inicio', '/mes', '/mes/2026-10?confirmar=e1', '/ajustes', '/login']) expect(classify(req(p), O), p).toBe('page');
    expect(classify(req('/'), O)).toBe('network-only'); // / siempre redirige
  });
  it('estáticos y el resto', () => {
    expect(classify(req('/_next/static/chunks/a1b2.js'), O)).toBe('static');
    expect(classify(req('/icons/icon-192.png'), O)).toBe('static');
    expect(classify(req('/serwist/sw.js'), O)).toBe('network-only');
    expect(classify(req('/manifest.webmanifest'), O)).toBe('network-only');
  });
});

describe('cachés', () => {
  it('al activar borra datos, pantallas y versiones viejas; deja estáticos y precache', () => {
    expect(cachesToDelete([CACHE.api, CACHE.pages, CACHE.static, 'kuadrix-api-v0', 'serwist-precache-v2-https://kuadrix.app/', 'otra']))
      .toEqual([CACHE.api, CACHE.pages, 'kuadrix-api-v0']);
  });
  it('solo guarda respuestas 200 sin redirección', () => {
    expect(cacheablePage({ status: 200, redirected: false })).toBe(true);
    expect(cacheablePage({ status: 200, redirected: true })).toBe(false);
    expect(cacheablePage({ status: 401, redirected: false })).toBe(false);
    expect(cacheablePage({ status: 0, redirected: false })).toBe(false);
  });
});

describe('push', () => {
  it('pushPayload: JSON, texto suelto y vacío', () => {
    expect(pushPayload('{"title":"Nómina","body":"Hoy","tag":"payday:x","url":"/mes/2026-12?confirmar=e1"}'))
      .toEqual({ title: 'Nómina', body: 'Hoy', tag: 'payday:x', url: '/mes/2026-12?confirmar=e1' });
    expect(pushPayload('hola')).toEqual({ title: 'Kuadrix', body: 'hola', url: '/inicio' });
    expect(pushPayload(null)).toEqual({ title: 'Kuadrix', body: '', url: '/inicio' });
  });
  it('notificationTarget: siempre en el origen propio', () => {
    expect(notificationTarget('/mes/2026-12?confirmar=e1', O)).toBe(`${O}/mes/2026-12?confirmar=e1`);
    expect(notificationTarget('https://evil.com/x?y=1', O)).toBe(`${O}/x?y=1`);
    expect(notificationTarget(undefined, O)).toBe(`${O}/inicio`);
  });
});
