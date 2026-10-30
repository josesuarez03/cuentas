import { createHash } from 'node:crypto';
import { eq, like } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as s from '@/db/schema';

// Better Auth lee la configuración al importarse: antes de cargar las rutas.
const SECRET = vi.hoisted(() => {
  const secret = 'pruebas-unitarias-no-es-un-secreto-0123456789';
  process.env.BETTER_AUTH_SECRET = secret;
  process.env.BETTER_AUTH_URL = 'http://localhost:3000';
  process.env.ALLOWED_EMAILS = 'ana@example.com';
  process.env.GOOGLE_CLIENT_ID = 'pruebas';
  process.env.GOOGLE_CLIENT_SECRET = 'pruebas';
  return secret;
});
vi.mock('@/db', async () => {
  const { createTestDb } = await import('@/test/db');
  return { db: await createTestDb() };
});

const { db } = await import('@/db');
const { auth } = await import('@/features/auth/auth');
const { POST: vincular } = await import('@/app/api/entrar/vincular/route');
const { POST: recoger } = await import('@/app/api/entrar/recoger/route');
const { seedSession, signSessionCookie, SESSION_COOKIE } = await import('../../../e2e/support/session');

const H = Buffer.from(Array.from({ length: 32 }, (_, i) => i * 8 + 3)).toString('base64url'); // 43 caracteres
const otherH = 'Z'.repeat(43);

function post(handler: (r: Request) => Promise<Response>, body: unknown, cookie?: string) {
  return handler(new Request('http://localhost:3000/api/entrar/x', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie: `${SESSION_COOKIE}=${cookie}` } : {}) },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  }));
}

const hex = (h: string) => createHash('sha256').update(h).digest('hex');
let anaCookie: string;

beforeEach(async () => {
  await db.delete(s.verification);
  await db.delete(s.session);
  await db.delete(s.user);
  const { token } = await seedSession(db, { email: 'ana@example.com', name: 'Ana' });
  anaCookie = await signSessionCookie(token, SECRET);
});

function sessionCookieFrom(res: Response): string | undefined {
  const line = res.headers.getSetCookie().find((c) => c.startsWith(`${SESSION_COOKIE}=`));
  return line?.split(';')[0].slice(SESSION_COOKIE.length + 1);
}

describe('/api/entrar/vincular', () => {
  it('sin sesión → 401 y no guarda nada', async () => {
    const res = await post(vincular, { h: H });
    expect(res.status).toBe(401);
    expect(await db.select().from(s.verification)).toEqual([]);
  });

  it('con sesión de un email sin acceso → 401', async () => {
    const { token } = await seedSession(db, { email: 'intruso@example.com', name: 'X' });
    const res = await post(vincular, { h: H }, await signSessionCookie(token, SECRET));
    expect(res.status).toBe(401);
  });

  it('código ausente, corto, largo, con caracteres raros o cuerpo no JSON → 400', async () => {
    for (const body of [{}, { h: 'abc' }, { h: H + 'a' }, { h: H.slice(0, 42) + '=' }, { h: 42 }, 'no-json']) {
      const res = await post(vincular, body, anaCookie);
      expect(res.status, JSON.stringify(body)).toBe(400);
    }
    expect(await db.select().from(s.verification)).toEqual([]);
  });

  it('guarda solo el sha256 del código, caduca en 3 min y sustituye uno anterior', async () => {
    expect((await post(vincular, { h: H }, anaCookie)).status).toBe(204);
    expect((await post(vincular, { h: H }, anaCookie)).status).toBe(204);
    const rows = await db.select().from(s.verification).where(eq(s.verification.identifier, `kuadrix-handoff:${hex(H)}`));
    expect(rows).toHaveLength(1);
    const ms = rows[0].expiresAt.getTime() - Date.now();
    expect(ms).toBeGreaterThan(2.5 * 60_000);
    expect(ms).toBeLessThanOrEqual(3 * 60_000);
    const all = await db.select().from(s.verification);
    expect(JSON.stringify(all)).not.toContain(H);
  });
});

it('el navegador no puede pedir tokens de un solo uso directamente a Better Auth', async () => {
  const res = await auth.handler(new Request('http://localhost:3000/api/auth/one-time-token/generate', {
    headers: { cookie: `${SESSION_COOKIE}=${anaCookie}` },
  }));
  expect(res.status).toBe(400);
  expect(await db.select().from(s.verification)).toEqual([]);
});

describe('/api/entrar/recoger', () => {
  it('con el código vinculado devuelve la cookie de sesión de esa cuenta, una sola vez', async () => {
    expect((await post(vincular, { h: H }, anaCookie)).status).toBe(204);

    const res = await post(recoger, { h: H });
    expect(res.status).toBe(204);
    const cookie = sessionCookieFrom(res);
    expect(cookie).toBeTruthy();
    const session = await auth.api.getSession({ headers: new Headers({ cookie: `${SESSION_COOKIE}=${cookie}` }) });
    expect(session?.user.email).toBe('ana@example.com');

    expect((await post(recoger, { h: H })).status).toBe(404);
    expect(await db.select().from(s.verification).where(like(s.verification.identifier, 'kuadrix-handoff:%'))).toEqual([]);
    expect(await db.select().from(s.verification).where(like(s.verification.identifier, 'one-time-token:%'))).toEqual([]);
  });

  it('un código que no se vinculó → 404 sin cookie', async () => {
    await post(vincular, { h: H }, anaCookie);
    const res = await post(recoger, { h: otherH });
    expect(res.status).toBe(404);
    expect(sessionCookieFrom(res)).toBeUndefined();
  });

  it('caducado → 404 y se borra', async () => {
    await post(vincular, { h: H }, anaCookie);
    await db.update(s.verification).set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(s.verification.identifier, `kuadrix-handoff:${hex(H)}`));
    const res = await post(recoger, { h: H });
    expect(res.status).toBe(404);
    expect(sessionCookieFrom(res)).toBeUndefined();
    expect(await db.select().from(s.verification).where(like(s.verification.identifier, 'kuadrix-handoff:%'))).toEqual([]);
  });

  it('código no válido → 400', async () => {
    for (const body of [{}, { h: 'corto' }, 'no-json']) {
      expect((await post(recoger, body)).status, JSON.stringify(body)).toBe(400);
    }
  });
});
