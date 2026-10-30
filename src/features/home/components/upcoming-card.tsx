import type { Upcoming } from '@/features/month/domain/upcoming';
import { formatEuros } from '@/lib/money';
import { cn } from '@/lib/utils';
import { formatMonthNameOnly } from '@/lib/year-month';
import { HomeCard } from './home-card';

export function UpcomingCard({ upcoming }: { upcoming: Upcoming }) {
  return (
    <HomeCard
      labelId="inicio-proximo"
      title={`En ${formatMonthNameOnly(upcoming.yearMonth)}, además`}
      aside={(
        <span className="text-[13px] text-ink-muted">
          <span className="sr-only">Total: </span>
          {formatEuros(upcoming.totalCents, { sign: true })}
        </span>
      )}
    >
      <ul>
        {upcoming.items.map((it, i) => (
          <li key={it.id} className={cn('flex min-h-12 items-center justify-between gap-3 text-[15px]', i > 0 && 'border-t border-line')}>
            <span className="min-w-0">
              {it.name} <span className="text-[13px] text-ink-muted">· {it.note}</span>
            </span>
            <span className={cn('shrink-0 font-medium', it.signedCents > 0 && 'text-positivo')}>
              {formatEuros(it.signedCents, { sign: true })}
            </span>
          </li>
        ))}
      </ul>
    </HomeCard>
  );
}
