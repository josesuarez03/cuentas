// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  claimHandoff, clearPendingHandoff, handoffCallbackURL, linkHandoff, newHandoffCode, pendingHandoff, savePendingHandoff,
} from './pwa-handoff';

afterEach(() => { clearPendingHandoff(); sessionStorage.clear(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it('el código son 32 bytes aleatorios en base64url (43 caracteres) y no se repite', () => {
  const a = newHandoffCode();
  const b = newHandoffCode();
  expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(a).not.toBe(b);
});

it('la vuelta de Google lleva el código en /entrar/listo', () => {
  expect(handoffCallbackURL('abc')).toBe('/entrar/listo?h=abc');
});

describe('código pendiente', () => {
  it('se guarda en sessionStorage y en memoria, y se borra', () => {
    savePendingHandoff({ h: 'x'.repeat(43), next: '/mes/2026-10', startedAt: 1000 });
    expect(JSON.parse(sessionStorage.getItem('kuadrix:entrar')!)).toEqual({ h: 'x'.repeat(43), next: '/mes/2026-10', startedAt: 1000 });
    expect(pendingHandoff(2000)).toEqual({ h: 'x'.repeat(43), next: '/mes/2026-10', startedAt: 1000 });
    clearPendingHandoff();
    expect(pendingHandoff(2000)).toBeNull();
    expect(sessionStorage.getItem('kuadrix:entrar')).toBeNull();
  });

  it('se recupera de sessionStorage al volver a abrir la app', () => {
    sessionStorage.setItem('kuadrix:entrar', JSON.stringify({ h: 'y'.repeat(43), next: '/inicio', startedAt: 1000 }));
    expect(pendingHandoff(2000)?.h).toBe('y'.repeat(43));
  });

  it('caduca a los 5 minutos', () => {
    savePendingHandoff({ h: 'x'.repeat(43), next: '/inicio', startedAt: 0 });
    expect(pendingHandoff(5 * 60_000 - 1)).not.toBeNull();
    expect(pendingHandoff(5 * 60_000)).toBeNull();
    expect(sessionStorage.getItem('kuadrix:entrar')).toBeNull();
  });

  it('ignora lo que no sea un código válido y un destino inseguro va a /inicio', () => {
    sessionStorage.setItem('kuadrix:entrar', '{roto');
    expect(pendingHandoff(0)).toBeNull();
    sessionStorage.setItem('kuadrix:entrar', JSON.stringify({ h: 'corto', next: '/inicio', startedAt: 0 }));
    expect(pendingHandoff(0)).toBeNull();
    sessionStorage.setItem('kuadrix:entrar', JSON.stringify({ h: 'z'.repeat(43), next: '//evil.example', startedAt: 0 }));
    expect(pendingHandoff(0)?.next).toBe('/inicio');
  });

  it('sin sessionStorage (bloqueado), sigue en memoria', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('SecurityError'); });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('SecurityError'); });
    savePendingHandoff({ h: 'x'.repeat(43), next: '/inicio', startedAt: 0 });
    expect(pendingHandoff(1)?.h).toBe('x'.repeat(43));
  });
});

describe('peticiones', () => {
  it('recoger: POST con el código; solo 204 es éxito; sin red, false', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response('{}', { status: 404 }))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', fetch);
    expect(await claimHandoff('h1')).toBe(true);
    expect(fetch).toHaveBeenCalledWith('/api/entrar/recoger', {
      method: 'POST', credentials: 'same-origin', cache: 'no-store', headers: { 'content-type': 'application/json' }, body: '{"h":"h1"}',
    });
    expect(await claimHandoff('h1')).toBe(false);
    expect(await claimHandoff('h1')).toBe(false);
  });

  it('vincular: POST con el código a /api/entrar/vincular', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response(null, { status: 204 })).mockResolvedValueOnce(new Response('{}', { status: 401 }));
    vi.stubGlobal('fetch', fetch);
    expect(await linkHandoff('h2')).toBe(true);
    expect(fetch.mock.calls[0][0]).toBe('/api/entrar/vincular');
    expect(fetch.mock.calls[0][1].body).toBe('{"h":"h2"}');
    expect(await linkHandoff('h2')).toBe(false);
  });
});
