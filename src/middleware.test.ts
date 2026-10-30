import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { config, middleware } from './middleware';

const protegida = (path: string) => new RegExp(`^${config.matcher[0]}$`).test(path);

describe('middleware', () => {
  it('deja pasar sin sesión lo que la PWA pide sin cookies', () => {
    for (const p of ['/manifest.webmanifest', '/icons/icon-192.png', '/icon.png', '/apple-icon.png', '/serwist/sw.js', '/sw.js',
      '/sin-conexion', '/entrar/listo', '/_vercel/speed-insights/script.js', '/login', '/api/auth/callback/google', '/api/cron/daily']) {
      expect(protegida(p), p).toBe(false);
    }
  });
  it('protege pantallas y API', () => {
    for (const p of ['/', '/inicio', '/mes/2026-10', '/primer-uso', '/ajustes', '/api/months/2026-10', '/sin-conexionx', '/entrar/listox', '/entrar', '/iconsx']) {
      expect(protegida(p), p).toBe(true);
    }
  });
  it('sin cookie: pantalla → /login?next=…, / → /login, API → 401', async () => {
    const a = middleware(new NextRequest('http://localhost/mes/2026-10?confirmar=e1'));
    expect(a.status).toBe(307);
    expect(a.headers.get('location')).toBe('http://localhost/login?next=%2Fmes%2F2026-10%3Fconfirmar%3De1');
    expect(middleware(new NextRequest('http://localhost/')).headers.get('location')).toBe('http://localhost/login');
    const api = middleware(new NextRequest('http://localhost/api/wealth'));
    expect(api.status).toBe(401);
    expect(await api.json()).toEqual({ error: 'Inicia sesión para continuar.' });
  });
});
