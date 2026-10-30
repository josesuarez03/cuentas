import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { requireUser } from '@/features/auth/session';
import { OnboardingWizard } from '@/features/onboarding/components/onboarding-wizard';
import { needsOnboarding } from '@/features/onboarding/server/onboarding';
import { OfflineBanner } from '@/shared/components/offline-banner';
import { Providers } from '@/shared/components/providers';

export const metadata: Metadata = { title: 'Primer uso · Kuadrix' };

export default async function PrimerUsoPage() {
  const user = await requireUser();
  if (!(await needsOnboarding(db, user.id))) redirect('/inicio');
  return (
    <Providers>
      <main className="min-h-dvh bg-paper px-4 py-8">
        <OfflineBanner />
        <OnboardingWizard />
      </main>
    </Providers>
  );
}
