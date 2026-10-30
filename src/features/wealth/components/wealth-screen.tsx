'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAddSnapshot, useWealth, WealthFetchError } from '@/features/wealth/hooks/use-wealth';
import type { AccountBalance } from '@/features/wealth/domain/types';
import { formatEuros } from '@/lib/money';
import { cn } from '@/lib/utils';
import { formatMonthNameOnly } from '@/lib/year-month';
import { EmptyState } from '@/shared/components/empty-state';
import { Button } from '@/shared/components/ui/button';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { AccountList } from './account-list';
import { LoansList } from './loans-list';
import { UpdateBalanceSheet } from './update-balance-sheet';

export function WealthScreen() {
  const query = useWealth();
  const addSnapshot = useAddSnapshot();
  const [selected, setSelected] = useState<AccountBalance | null>(null);
  const [open, setOpen] = useState(false);
  const view = query.data;

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 pt-5 pb-6 md:max-w-2xl md:px-6 md:pt-8">
      <h1 className="text-[22px] leading-7 font-semibold tracking-[-0.01em]">Patrimonio</h1>

      {query.isPending && (
        <div role="status" aria-busy="true" aria-label="Cargando el patrimonio" className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-md bg-surface-sunk motion-reduce:animate-none" />)}
        </div>
      )}
      {query.isError && !view && (
        <div className="py-10 text-center">
          <p className="text-[15px]">{query.error.message}</p>
          {!(query.error instanceof WealthFetchError && query.error.status < 500) && (
            <Button variant="outline" className="mt-4 min-h-11" onClick={() => query.refetch()}>Reintentar</Button>
          )}
        </div>
      )}

      {view && view.accounts.length === 0 && (
        <EmptyState
          title="Aún no tienes cuentas"
          action={<Button asChild variant="outline" className="min-h-11 text-[15px]"><Link href="/ajustes">Ir a Ajustes</Link></Button>}
        >
          Crea tus cuentas en Ajustes para ver aquí el saldo de cada una y el total.
        </EmptyState>
      )}

      {view && view.accounts.length > 0 && (
        <>
          <div>
            <p className="text-[13px] text-ink-muted">Total</p>
            <p className="text-[32px] leading-10 font-semibold tabular-nums">{formatEuros(view.totalCents)}</p>
            <div className="mt-2 h-1 border-y border-ink" aria-hidden />
            {view.variationCents !== null && (
              <p className={cn('mt-2 text-[13px] tabular-nums', view.variationCents > 0 ? 'text-positivo' : 'text-ink-muted')}>
                {formatEuros(view.variationCents, { sign: true })} desde {formatMonthNameOnly(view.previousYearMonth)}
              </p>
            )}
          </div>

          <section aria-labelledby="patrimonio-cuentas">
            <h2 id="patrimonio-cuentas" className="pb-2 text-[17px] leading-6 font-semibold">Cuentas</h2>
            <AccountList accounts={view.accounts} onUpdate={(a) => { setSelected(a); setOpen(true); }} />
          </section>

          {view.loans.length > 0 && <LoansList loans={view.loans} />}

          <UpdateBalanceSheet
            account={selected}
            open={open}
            onOpenChange={setOpen}
            onSave={(c) => { if (selected) addSnapshot.mutate({ accountId: selected.accountId, balanceCents: c }); }}
          />
        </>
      )}
    </main>
  );
}
