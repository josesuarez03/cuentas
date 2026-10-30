'use client';

import { useSettings } from '@/features/settings/hooks/use-settings';
import { Button } from '@/shared/components/ui/button';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { useOnline } from '@/shared/hooks/use-online';
import { AccountsSection } from './accounts-section';
import { CategoriesSection } from './categories-section';
import { NotificationsSection } from './notifications-section';
import { PocketsFundsSection } from './pockets-funds-section';
import { RecurringSection } from './recurring-section';
import { SettingsSection } from './settings-section';
import { SignOutSection } from './sign-out-section';
import { SplitSection } from './split-section';
import { ThemeControl } from './theme-control';

export function SettingsScreen({ vapidPublicKey }: { vapidPublicKey: string | null }) {
  const { data, error, isPending, refetch } = useSettings();
  const online = useOnline();

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-8 px-4 pt-5 pb-6 md:max-w-2xl md:px-6 md:pt-8 lg:max-w-3xl">
      <h1 className="text-xl leading-[26px] font-semibold text-ink">Ajustes</h1>
      {isPending && (
        <div className="flex flex-col gap-6" aria-busy="true">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      )}
      {error && !data && (
        <div role="alert" className="flex flex-col items-start gap-3">
          <p className="text-[15px] text-ink-muted">{error.message}</p>
          <Button variant="outline" className="min-h-11" onClick={() => void refetch()}>Reintentar</Button>
        </div>
      )}
      {data && (
        <>
          <fieldset disabled={!online} className="m-0 flex min-w-0 flex-col gap-8 border-0 p-0">
            <RecurringSection settings={data} />
            <AccountsSection accounts={data.accounts} />
            <CategoriesSection categories={data.categories} />
            <PocketsFundsSection settings={data} />
            <SplitSection accounts={data.accounts} />
            <NotificationsSection preferences={data.preferences} vapidPublicKey={vapidPublicKey} />
          </fieldset>
          <SettingsSection id="ajustes-tema" title="Tema">
            <div className="py-3"><ThemeControl /></div>
          </SettingsSection>
          <SignOutSection />
        </>
      )}
    </main>
  );
}
