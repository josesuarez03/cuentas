import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { requireUser } from '@/features/auth/session';
import { HomeScreen } from '@/features/home/components/home-screen';
import { needsOnboarding } from '@/features/onboarding/server/onboarding';

export const metadata: Metadata = { title: 'Inicio · Kuadrix' };

export default async function InicioPage() {
  const user = await requireUser();
  if (await needsOnboarding(db, user.id)) redirect('/primer-uso');
  return <HomeScreen />;
}
