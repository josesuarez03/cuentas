'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';
import { todoItems } from '@/features/home/domain/todo';
import { AddEntrySheet, type AddMode } from '@/features/month/components/add-entry-sheet';
import { isMonthEmpty } from '@/features/month/domain/month-view';
import { MonthFetchError, useConfirmIncome, useMonth } from '@/features/month/hooks/use-month';
import { useMarkLoanRepaid } from '@/features/month/hooks/use-loans';
import { useMonthStore } from '@/features/month/store/month-store';
import { UpdateBalanceSheet } from '@/features/wealth/components/update-balance-sheet';
import type { AccountBalance } from '@/features/wealth/domain/types';
import { useAddSnapshot, useWealth } from '@/features/wealth/hooks/use-wealth';
import { cn } from '@/lib/utils';
import { currentYearMonth, formatMonthName, formatWeekdayDay } from '@/lib/year-month';
import { EmptyState } from '@/shared/components/empty-state';
import { Button } from '@/shared/components/ui/button';
import { AvailableSummary } from './available-summary';
import { HomeSkeleton } from './home-skeleton';
import { PocketsCard } from './pockets-card';
import { TodoCard } from './todo-card';
import { UpcomingCard } from './upcoming-card';
import { WealthCard } from './wealth-card';

export function HomeScreen() {
  const ym = currentYearMonth();
  const query = useMonth(ym);
  const confirm = useConfirmIncome(ym);
  const resetMonth = useMonthStore((s) => s.reset);
  const wealth = useWealth();
  const repay = useMarkLoanRepaid();
  const addSnapshot = useAddSnapshot();
  const [addOpen, setAddOpen] = useState(false);
  const [addMode, setAddMode] = useState<AddMode>('expense');
  const [balanceFor, setBalanceFor] = useState<AccountBalance | null>(null);
  const [balanceOpen, setBalanceOpen] = useState(false);

  const data = query.data;
  const view = data?.view;
  const empty = view ? isMonthEmpty(view) : false;
  const todos = view ? todoItems(view, wealth.data ?? null) : [];
  const pockets = view && !empty ? view.pockets : [];
  const upcoming = data?.upcoming && data.upcoming.items.length > 0 ? data.upcoming : null;
  const later = data?.upcomingLater && data.upcomingLater.items.length > 0 ? data.upcomingLater : null;
  const wealthData = wealth.data && wealth.data.accounts.some((a) => a.estimatedCents !== null) ? wealth.data : null;
  const hasAside = pockets.length > 0 || wealthData !== null || upcoming !== null || later !== null;

  function openAdd(mode: AddMode) {
    setAddMode(mode);
    setAddOpen(true);
  }

  return (
    <main
      className={cn(
        'mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 px-4 pt-5 pb-6 md:px-6 md:pt-8',
        hasAside && 'lg:grid lg:max-w-5xl lg:grid-cols-2 lg:content-start lg:items-start lg:gap-x-8',
      )}
    >
      <header className="flex items-baseline justify-between gap-3 lg:col-span-2">
        <h1 className="text-[22px] leading-7 font-semibold tracking-[-0.01em]">{formatMonthName(ym)}</h1>
        <span className="text-[13px] text-ink-muted" suppressHydrationWarning>{formatWeekdayDay()}</span>
      </header>

      {query.isPending && <HomeSkeleton />}
      {query.isError && !data && (
        <div className="py-10 text-center lg:col-span-2">
          <p className="text-[15px]">{query.error.message}</p>
          {!(query.error instanceof MonthFetchError && query.error.status < 500) && (
            <Button variant="outline" className="mt-4 min-h-11" onClick={() => query.refetch()}>Reintentar</Button>
          )}
        </div>
      )}

      {data && view && (
        <>
          <div className="flex flex-col gap-4">
            {empty ? (
              <EmptyState
                title="Empieza por tu primera partida"
                action={view.status === 'open' && (
                  <Button className="min-h-12 w-full gap-2 text-base font-semibold" onClick={() => openAdd('expense')}>
                    <Plus className="size-5" aria-hidden />
                    Añadir al mes
                  </Button>
                )}
              >
                Aquí verás lo que te queda para ahorrar este mes. Apunta un ingreso o un gasto para empezar; lo que se repite se copiará solo cada mes.
              </EmptyState>
            ) : (
              <AvailableSummary view={view} onAdd={() => openAdd('expense')} onOpenMonth={resetMonth} />
            )}
            <TodoCard items={todos} onAction={(t) => {
              if (t.kind === 'income') confirm.mutate(t.targetId);
              else if (t.kind === 'loan') repay.mutate(t.targetId);
              else {
                const account = wealth.data?.accounts.find((a) => a.accountId === t.targetId);
                if (account) { setBalanceFor(account); setBalanceOpen(true); }
              }
            }} />
          </div>
          {hasAside && (
            <div className="flex flex-col gap-4">
              {pockets.length > 0 && <PocketsCard pockets={pockets} onAddExpense={() => openAdd('pocket')} />}
              {wealthData && <WealthCard wealth={wealthData} />}
              {(upcoming || later) && <UpcomingCard upcoming={upcoming} later={later} />}
            </div>
          )}
          <AddEntrySheet open={addOpen} onOpenChange={setAddOpen} ym={ym} catalog={data.catalog} pockets={view.pockets} initialMode={addMode} />
          <UpdateBalanceSheet
            account={balanceFor}
            open={balanceOpen}
            onOpenChange={setBalanceOpen}
            onSave={(c) => { if (balanceFor) addSnapshot.mutate({ accountId: balanceFor.accountId, balanceCents: c }); }}
          />
        </>
      )}
    </main>
  );
}
