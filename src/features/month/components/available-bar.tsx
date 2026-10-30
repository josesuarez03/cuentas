'use client';

import type { MonthView } from '@/features/month/domain/month-view';
import { formatEuros } from '@/lib/money';
import { cn } from '@/lib/utils';

export function AvailableBar({ view, onEditSplit }: { view: MonthView; onEditSplit: () => void }) {
  const available = view.calc.availableCents;
  const splitText = view.split.length > 0
    ? view.split.map((s) => `${s.accountName} ${s.percent} %: ${formatEuros(s.cents)}`).join(' · ')
    : 'Elige a qué cuentas va el ahorro';
  return (
    <section aria-label="Resultado del mes" className="sticky bottom-(--app-nav-h) border-t border-line bg-surface px-4 pt-3 pb-3.5 md:border-x md:px-6 md:pb-[max(14px,env(safe-area-inset-bottom))]">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[15px] text-ink-muted">Disponible para ahorrar</span>
        <span className={cn('text-[32px] leading-[38px] font-semibold tracking-[-0.02em]', available < 0 && 'text-alerta')}>
          {formatEuros(available)}
        </span>
      </div>
      <div aria-hidden className="mt-1 mb-1 h-1 border-y border-ink" />
      <button
        type="button"
        onClick={onEditSplit}
        disabled={view.status !== 'open'}
        className="ml-auto block min-h-11 text-right text-[13px] text-ink-muted underline-offset-4 hover:underline disabled:no-underline"
      >
        {splitText}
      </button>
    </section>
  );
}
