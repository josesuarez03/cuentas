'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';
import { AddEntrySheet, type AddMode } from '@/features/month/components/add-entry-sheet';
import { FundSpendDialog } from '@/features/month/components/fund-spend-dialog';
import { AvailableBar } from '@/features/month/components/available-bar';
import { CategoryList } from '@/features/month/components/category-list';
import { MonthHeader } from '@/features/month/components/month-header';
import { MonthSkeleton } from '@/features/month/components/month-skeleton';
import { SplitDialog } from '@/features/month/components/split-dialog';
import { isMonthEmpty } from '@/features/month/domain/month-view';
import { EmptyState } from '@/shared/components/empty-state';
import { Button } from '@/shared/components/ui/button';
import { MonthFetchError, useMonth, useUpdateAmount } from '@/features/month/hooks/use-month';
import { useSetMonthStatus } from '@/features/month/hooks/use-month-status';
import { currentYearMonth } from '@/lib/year-month';
import { useMonthStore } from '@/features/month/store/month-store';

export function MonthScreen() {
  const ym = useMonthStore((s) => s.ym);
  const query = useMonth(ym);
  const update = useUpdateAmount(ym);
  const status = useSetMonthStatus(ym);
  const [splitOpen, setSplitOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addMode, setAddMode] = useState<AddMode>('expense');
  const [fundId, setFundId] = useState<string | null>(null);

  const data = query.data;
  const open = data?.view.status === 'open';
  const past = ym < currentYearMonth();

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col md:max-w-2xl">
      <MonthHeader />
      {query.isPending && <MonthSkeleton />}
      {query.isError && !query.data && (
        <div className="px-4 py-10 text-center">
          <p className="text-[15px]">{query.error.message}</p>
          {!(query.error instanceof MonthFetchError && query.error.status < 500) && (
            <Button variant="outline" className="mt-4 min-h-11" onClick={() => query.refetch()}>Reintentar</Button>
          )}
        </div>
      )}
      {data && (isMonthEmpty(data.view) ? (
        <main className="flex-1 px-4 md:px-6">
          <EmptyState
            title="Este mes aún no tiene partidas"
            action={open && (
              <Button className="min-h-12 w-full gap-2 text-base font-semibold" onClick={() => {
                setAddMode('expense');
                setAddOpen(true);
              }}>
                <Plus className="size-5" aria-hidden />
                Añadir al mes
              </Button>
            )}
          >
            {open
              ? 'Cada mes se copia solo de tu plantilla de recurrentes; cuando la tengas, aparecerá aquí. Mientras, puedes apuntar un ingreso o un gasto solo para este mes.'
              : 'Este mes se cerró sin partidas. Es de solo lectura.'}
          </EmptyState>
        </main>
      ) : (
        <>
          <main className="flex-1 px-4 pb-4 md:px-6">
            <CategoryList
              view={data.view}
              onAmountChange={(entryId, amountCents) => update.mutate({ entryId, amountCents })}
              onAddPocketExpense={() => {
                setAddMode('pocket');
                setAddOpen(true);
              }}
              onSpendFund={setFundId}
            />
            {open ? (
              <div className="mt-2 flex flex-wrap items-center gap-x-6">
                <Button
                  variant="link"
                  className="min-h-11 px-0 text-[15px] text-tinta"
                  onClick={() => {
                    setAddMode('expense');
                    setAddOpen(true);
                  }}
                >
                  <Plus className="size-[18px]" aria-hidden />
                  Añadir
                </Button>
                {past && (
                  <Button variant="link" className="min-h-11 px-0 text-[15px] text-tinta" onClick={() => status.mutate('closed')}>
                    Cerrar mes
                  </Button>
                )}
              </div>
            ) : (
              <div className="mt-4 flex flex-wrap items-center gap-x-4">
                <p className="text-[13px] text-ink-muted">Mes cerrado: solo lectura.</p>
                <Button variant="link" className="min-h-11 px-0 text-[15px] text-tinta" onClick={() => status.mutate('open')}>
                  Reabrir mes
                </Button>
              </div>
            )}
          </main>
          <AvailableBar view={data.view} onEditSplit={() => setSplitOpen(true)} />
        </>
      ))}
      {data && (
        <>
          <SplitDialog
            open={splitOpen}
            onOpenChange={setSplitOpen}
            ym={ym}
            view={data.view}
            accounts={data.catalog.accounts.filter((a) => a.type !== 'credit_card' && a.type !== 'joint')}
          />
          <AddEntrySheet
            open={addOpen}
            onOpenChange={setAddOpen}
            ym={ym}
            catalog={data.catalog}
            pockets={data.view.pockets}
            initialMode={addMode}
          />
          <FundSpendDialog
            open={fundId !== null}
            onOpenChange={(next) => {
              if (!next) setFundId(null);
            }}
            ym={ym}
            fund={data.view.funds.find((x) => x.id === fundId) ?? null}
          />
        </>
      )}
    </div>
  );
}
