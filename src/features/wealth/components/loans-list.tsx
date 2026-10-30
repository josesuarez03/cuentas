'use client';

import { useMarkLoanRepaid } from '@/features/month/hooks/use-loans';
import type { PendingLoan } from '@/features/wealth/domain/types';
import { formatEuros } from '@/lib/money';
import { formatMonthNameOnly } from '@/lib/year-month';
import { Button } from '@/shared/components/ui/button';
import { useOnline } from '@/shared/hooks/use-online';

export function LoansList({ loans }: { loans: PendingLoan[] }) {
  const markRepaid = useMarkLoanRepaid();
  const online = useOnline();
  return (
    <section aria-labelledby="patrimonio-prestamos" className="rounded-lg border border-line bg-surface px-4">
      <h2 id="patrimonio-prestamos" className="pt-4 text-[17px] leading-6 font-semibold">Préstamos por cobrar</h2>
      <ul>
        {loans.map((l) => (
          <li key={l.id} className="flex min-h-16 items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-medium tabular-nums">{l.person} te debe {formatEuros(l.amountCents)}</p>
              <p className="text-[13px] text-ink-muted">
                Desde {formatMonthNameOnly(l.lentYearMonth)}{l.note ? ` · ${l.note}` : ''}
              </p>
            </div>
            <Button
              variant="ghost"
              className="min-h-11 shrink-0 text-tinta"
              aria-label={`Marcar cobrado el préstamo de ${l.person}`}
              disabled={!online}
              onClick={() => markRepaid.mutate(l.id)}
            >
              Marcar cobrado
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
