'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';
import { AddEntrySheet } from '@/features/month/components/add-entry-sheet';
import { AvailableBar } from '@/features/month/components/available-bar';
import { CategoryList } from '@/features/month/components/category-list';
import { MonthHeader } from '@/features/month/components/month-header';
import { MonthSkeleton } from '@/features/month/components/month-skeleton';
import { SplitDialog } from '@/features/month/components/split-dialog';
import { Button } from '@/shared/components/ui/button';
import { MonthFetchError, useMonth, useUpdateAmount } from '@/features/month/hooks/use-month';
import { useMonthStore } from '@/features/month/store/month-store';

export function MonthScreen() {
  const ym = useMonthStore((s) => s.ym);
  const query = useMonth(ym);
  const update = useUpdateAmount(ym);
  const [splitOpen, setSplitOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const data = query.data;
  const isEmpty = data && data.view.categories.length === 0 && data.view.pockets.length === 0 && data.view.funds.length === 0;

  return (
    <>
      <MonthHeader />
      {query.isPending && <MonthSkeleton />}
      {query.isError && (
        <div className="px-4 py-10 text-center">
          <p className="text-[15px]">{query.error.message}</p>
          {!(query.error instanceof MonthFetchError && query.error.status < 500) && (
            <Button variant="outline" className="mt-4 min-h-11" onClick={() => query.refetch()}>Reintentar</Button>
          )}
        </div>
      )}
      {data && (
        <>
          <main className="flex-1 px-4 pb-4">
            {isEmpty && <p className="py-8 text-center text-[15px] text-ink-muted">Aún no hay partidas este mes. Añade la primera.</p>}
            <CategoryList view={data.view} onAmountChange={(entryId, amountCents) => update.mutate({ entryId, amountCents })} />
            {data.view.status === 'open' ? (
              <Button variant="link" className="mt-2 min-h-11 px-0 text-[15px] text-tinta" onClick={() => setAddOpen(true)}>
                <Plus className="size-[18px]" aria-hidden />
                Añadir
              </Button>
            ) : (
              <p className="mt-4 text-[13px] text-ink-muted">Mes cerrado: solo lectura.</p>
            )}
          </main>
          <AvailableBar view={data.view} onEditSplit={() => setSplitOpen(true)} />
          <SplitDialog
            open={splitOpen}
            onOpenChange={setSplitOpen}
            ym={ym}
            view={data.view}
            accounts={data.catalog.accounts.filter((a) => a.type !== 'credit_card' && a.type !== 'joint')}
          />
          <AddEntrySheet open={addOpen} onOpenChange={setAddOpen} ym={ym} catalog={data.catalog} />
        </>
      )}
    </>
  );
}
