import { Providers } from '@/shared/components/providers';
import { requireUser } from '@/features/auth/session';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return (
    <Providers>
      <div className="mx-auto flex min-h-dvh max-w-xl flex-col bg-paper">{children}</div>
    </Providers>
  );
}
