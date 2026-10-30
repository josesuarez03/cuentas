import { Plus } from 'lucide-react';
import Link from 'next/link';
import { Fragment } from 'react';
import type { MonthView } from '@/features/month/domain/month-view';
import { formatEuros } from '@/lib/money';
import { cn } from '@/lib/utils';
import { Button } from '@/shared/components/ui/button';
import { useOnline } from '@/shared/hooks/use-online';

export function AvailableSummary({ view, onAdd, onOpenMonth }: {
  view: MonthView;
  onAdd: () => void;
  onOpenMonth: () => void;
}) {
  const { calc } = view;
  const online = useOnline();
  return (
    <section aria-labelledby="inicio-disponible" className="flex flex-col pt-1 pb-2">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="inicio-disponible" tabIndex={-1} className="focus-visible:outline-none text-[15px] leading-[22px] font-normal text-ink-muted">Disponible para ahorrar</h2>
        <Link href="/mes" onClick={onOpenMonth} className="flex min-h-11 items-center text-[15px] font-medium text-tinta">Ver el mes</Link>
      </div>
      <p className={cn('text-[44px] leading-[50px] font-semibold tracking-[-0.02em]', calc.availableCents < 0 && 'text-alerta')}>
        {formatEuros(calc.availableCents)}
      </p>
      <div aria-hidden className="mt-2 mb-3 h-1 border-y border-ink" />
      <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-y-1 text-sm leading-5">
        <dt className="text-ink-muted">Ingresos</dt>
        <dd className="text-right text-positivo">{formatEuros(calc.incomeCents, { sign: true })}</dd>
        <dt className="text-ink-muted">Gastos</dt>
        <dd className="text-right">{formatEuros(-calc.expenseCents)}</dd>
        <dt className="text-ink-muted">Bolsas y huchas</dt>
        <dd className="text-right">{formatEuros(-(calc.pocketsCents + calc.fundsCents))}</dd>
      </dl>
      {view.split.length > 0 ? (
        <p className="mt-3 text-[13px] leading-[18px] text-ink-muted">
          Al ahorro:{' '}
          {view.split.map((s, i) => (
            <Fragment key={s.accountId}>
              {i > 0 && ' · '}
              {s.accountName} <strong className="font-semibold text-ink">{formatEuros(s.cents)}</strong>
            </Fragment>
          ))}
        </p>
      ) : (
        <Link href="/mes" onClick={onOpenMonth} className="mt-1 flex min-h-11 items-center text-[13px] text-tinta">
          Elige a qué cuentas va el ahorro
        </Link>
      )}
      {view.status === 'open' && (
        <Button className="mt-4 min-h-12 w-full gap-2 text-base font-semibold" onClick={onAdd} disabled={!online}>
          <Plus className="size-5" aria-hidden />
          Añadir al mes
        </Button>
      )}
    </section>
  );
}
