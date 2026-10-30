import 'server-only';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { isAllowedEmail } from '@/features/auth/allowlist';
import { auth } from '@/features/auth/auth';
import { safeNext } from '@/features/auth/safe-next';

// Una sola lectura de la sesión por petición (layout y página llaman a requireUser).
export const getSessionState = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { user: null, denied: false };
  if (!isAllowedEmail(session.user.email)) return { user: null, denied: true };
  return { user: session.user, denied: false };
});

export async function getUserOrNull() {
  return (await getSessionState()).user;
}

export async function requireUser() {
  const { user, denied } = await getSessionState();
  if (!user) {
    if (denied) redirect('/login?error=acceso');
    const next = safeNext((await headers()).get('x-next-path'));   // lo fija el middleware
    redirect(next === '/inicio' ? '/login' : `/login?next=${encodeURIComponent(next)}`);
  }
  return user;
}
