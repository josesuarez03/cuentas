import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { describe, expect, it } from 'vitest';
import * as schema from '@/db/schema';
import { createTestDb } from '@/test/db';
import { SESSION_COOKIE, addSession, seedSession, signSessionCookie, storageStateFor } from './session';

const SECRET = 'e2e-solo-pruebas-no-es-un-secreto-0123456789';
const authFor = (db: Awaited<ReturnType<typeof createTestDb>>) => betterAuth({
  secret: SECRET,
  baseURL: 'http://localhost:3100',
  database: drizzleAdapter(db, { provider: 'pg', schema: { user: schema.user, session: schema.session, account: schema.account, verification: schema.verification } }),
});

describe('sesión E2E', () => {
  it('la cookie firmada abre sesión en Better Auth', async () => {
    const db = await createTestDb();
    const { token } = await seedSession(db, { email: 'ana@e2e.kuadrix.test', name: 'Ana' });
    const cookie = await signSessionCookie(token, SECRET);
    const session = await authFor(db).api.getSession({ headers: new Headers({ cookie: `${SESSION_COOKIE}=${cookie}` }) });
    expect(session?.user.email).toBe('ana@e2e.kuadrix.test');
  });

  it('con otro secreto no abre sesión', async () => {
    const db = await createTestDb();
    const { token } = await seedSession(db, { email: 'ana@e2e.kuadrix.test', name: 'Ana' });
    const cookie = await signSessionCookie(token, 'otro-secreto-cualquiera-0123456789abcdef');
    expect(await authFor(db).api.getSession({ headers: new Headers({ cookie: `${SESSION_COOKIE}=${cookie}` }) })).toBeNull();
  });

  it('una segunda sesión del mismo usuario abre sesión por su cuenta', async () => {
    const db = await createTestDb();
    const { userId, token } = await seedSession(db, { email: 'ana@e2e.kuadrix.test', name: 'Ana' });
    const second = await addSession(db, userId);
    expect(second).not.toBe(token);
    const cookie = await signSessionCookie(second, SECRET);
    const session = await authFor(db).api.getSession({ headers: new Headers({ cookie: `${SESSION_COOKIE}=${cookie}` }) });
    expect(session?.user.id).toBe(userId);
  });

  it('storageState para localhost sin Secure', () => {
    const s = storageStateFor('v', 'http://localhost:3100');
    expect(s.cookies[0]).toMatchObject({ name: SESSION_COOKIE, value: 'v', domain: 'localhost', path: '/', httpOnly: true, secure: false, sameSite: 'Lax' });
  });
});
