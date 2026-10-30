import { AppNav } from '@/shared/components/app-nav';
import { OfflineBanner } from '@/shared/components/offline-banner';
import { Providers } from '@/shared/components/providers';
import { requireUser } from '@/features/auth/session';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return (
    <Providers>
      <AppNav />
      <div className="flex min-h-dvh flex-col bg-paper pb-(--app-nav-h) md:pl-60">
        <OfflineBanner />
        {children}
      </div>
    </Providers>
  );
}
