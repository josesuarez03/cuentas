import { randomBytes, randomUUID } from 'node:crypto';
import * as s from '@/db/schema';
import type { Db } from '@/db/types';

export const SESSION_COOKIE = 'better-auth.session_token';
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export async function signSessionCookie(token: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(token));
  return encodeURIComponent(`${token}.${Buffer.from(signature).toString('base64')}`);
}

export async function seedSession(db: Db, who: { email: string; name: string }): Promise<{ userId: string; token: string }> {
  const userId = randomUUID();
  const token = randomBytes(32).toString('base64url');
  await db.insert(s.user).values({ id: userId, email: who.email, name: who.name, emailVerified: true });
  await db.insert(s.session).values({ id: randomUUID(), userId, token, expiresAt: new Date(Date.now() + WEEK_MS) });
  return { userId, token };
}

export type Cookie = {
  name: string; value: string; domain: string; path: string; expires: number;
  httpOnly: boolean; secure: boolean; sameSite: 'Lax';
};

export function storageStateFor(cookieValue: string, baseURL: string): { cookies: Cookie[]; origins: [] } {
  return {
    cookies: [{
      name: SESSION_COOKIE,
      value: cookieValue,
      domain: new URL(baseURL).hostname,
      path: '/',
      expires: Math.floor((Date.now() + WEEK_MS) / 1000),
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    }],
    origins: [],
  };
}
