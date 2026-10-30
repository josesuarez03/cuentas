import Link from 'next/link';
import { wealthBar } from '@/features/home/domain/wealth-bar';
import type { WealthView } from '@/features/wealth/domain/types';
import { formatEuros } from '@/lib/money';
import { cn } from '@/lib/utils';
import { formatMonthNameOnly } from '@/lib/year-month';
import { HomeCard } from './home-card';

export function WealthCard({ wealth }: { wealth: WealthView }) {
  const { segments, legend } = wealthBar(wealth.accounts);
  return (
    <HomeCard
      labelId="inicio-patrimonio"
      title="Patrimonio"
      aside={<Link href="/patrimonio" className="flex min-h-11 items-center text-[15px] font-semibold text-tinta">Ver cuentas</Link>}
    >
      <div className="pb-4">
        <p className="text-2xl leading-8 font-semibold tabular-nums">{formatEuros(wealth.totalCents)}</p>
        {wealth.variationCents !== null && (
          <p className={cn('text-[13px] tabular-nums', wealth.variationCents > 0 ? 'text-positivo' : 'text-ink-muted')}>
            {formatEuros(wealth.variationCents, { sign: true })} desde {formatMonthNameOnly(wealth.previousYearMonth)}
          </p>
        )}
        {segments.length > 0 && (
          <div role="img" aria-label="Reparto del patrimonio por cuenta" className="my-3 flex h-2 gap-0.5 overflow-hidden rounded-full">
            {segments.map((s) => (
              <div key={s.accountId} className={s.color} style={{ width: `${s.pct}%` }} />
            ))}
          </div>
        )}
        <ul className={cn(segments.length === 0 && 'mt-3')}>
          {legend.map((l) => (
            <li key={l.accountId} className="flex min-h-7 items-center justify-between gap-3 text-[13px]">
              <span className="flex min-w-0 items-center gap-2">
                <span
                  aria-hidden
                  className={cn('size-2.5 shrink-0 rounded-full', l.color ?? 'border border-ink-muted')}
                />
                <span className="truncate">{l.name}</span>
              </span>
              <span className="shrink-0 tabular-nums">{formatEuros(l.cents)}</span>
            </li>
          ))}
        </ul>
      </div>
    </HomeCard>
  );
}
