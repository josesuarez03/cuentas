import type { Upcoming } from '@/features/month/domain/upcoming';
import { formatEuros } from '@/lib/money';
import { cn } from '@/lib/utils';
import { formatMonthNameOnly } from '@/lib/year-month';
import { HomeCard } from './home-card';

function Rows({ items }: { items: Upcoming['items'] }) {
  return (
    <ul>
      {items.map((it, i) => (
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
  );
}

export function UpcomingCard({ upcoming, later }: { upcoming: Upcoming | null; later: Upcoming | null }) {
  const first = upcoming && upcoming.items.length > 0 ? upcoming : null;
  const second = later && later.items.length > 0 ? later : null;
  const main = first ?? second;
  if (!main) return null;
  return (
    <HomeCard
      labelId="inicio-proximo"
      title={`En ${formatMonthNameOnly(main.yearMonth)}, además`}
      aside={(
        <span className="text-[13px] text-ink-muted">
          <span className="sr-only">Total: </span>
          {formatEuros(main.totalCents, { sign: true })}
        </span>
      )}
    >
      <Rows items={main.items} />
      {first && second && (
        <>
          <h3 className="border-t border-line pt-3 text-[13px] font-semibold text-ink-muted">Y en {formatMonthNameOnly(second.yearMonth)}</h3>
          <Rows items={second.items} />
        </>
      )}
    </HomeCard>
  );
}
