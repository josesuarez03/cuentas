import 'server-only';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { isAllowedEmail } from '@/features/auth/allowlist';
import { auth } from '@/features/auth/auth';

export async function getUserOrNull() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || !isAllowedEmail(session.user.email)) return null;
  return session.user;
}

export async function requireUser() {
  const user = await getUserOrNull();
  if (!user) redirect('/login');
  return user;
}
