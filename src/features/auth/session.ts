import 'server-only';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { isAllowedEmail } from '@/features/auth/allowlist';
import { auth } from '@/features/auth/auth';

async function readSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { user: null, denied: false };
  if (!isAllowedEmail(session.user.email)) return { user: null, denied: true };
  return { user: session.user, denied: false };
}

export async function getUserOrNull() {
  return (await readSession()).user;
}

export async function requireUser() {
  const { user, denied } = await readSession();
  if (!user) redirect(denied ? '/login?error=acceso' : '/login');
  return user;
}
