import { redirect } from 'next/navigation';
import { db } from '@/db';
import { getSessionState } from '@/features/auth/session';
import { landingPath } from '@/features/onboarding/domain/landing';
import { needsOnboarding } from '@/features/onboarding/server/onboarding';

export default async function Home() {
  const { user, denied } = await getSessionState();
  redirect(landingPath({ signedIn: user !== null, denied, needsOnboarding: user ? await needsOnboarding(db, user.id) : false }));
}
