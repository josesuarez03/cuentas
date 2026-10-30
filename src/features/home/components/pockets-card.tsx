import { pocketProgress, type PocketView } from '@/features/month/domain/month-view';
import { formatEuros } from '@/lib/money';
import { cn } from '@/lib/utils';
import { Button } from '@/shared/components/ui/button';
import { Progress } from '@/shared/components/ui/progress';
import { HomeCard } from './home-card';
import { useOnline } from '@/shared/hooks/use-online';

export function PocketsCard({ pockets, onAddExpense }: { pockets: PocketView[]; onAddExpense: () => void }) {
  const online = useOnline();
  return (
    <HomeCard labelId="inicio-bolsas" title="Bolsas"
      aside={(
        <Button variant="ghost" className="min-h-11 px-0.5 text-[15px] font-semibold text-tinta" onClick={onAddExpense} disabled={!online}>
          Apuntar gasto
        </Button>
      )}
    >
      <ul className="flex flex-col gap-3.5 pt-1 pb-4">
        {pockets.map((p) => {
          const { pct, over, restCents } = pocketProgress(p);
          return (
            <li key={p.id} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-2 text-[15px] leading-[22px]">
                <span className="min-w-0">
                  {p.name}{' '}
                  <span className="text-[13px] text-ink-muted">{formatEuros(p.spentCents)} de {formatEuros(p.limitCents)}</span>
                </span>
                <span className={cn('shrink-0 text-[13px] font-medium', over ? 'text-alerta' : 'text-ink-muted')}>
                  {over ? `Te pasas ${formatEuros(-restCents)}` : `Quedan ${formatEuros(restCents)}`}
                </span>
              </div>
              <Progress
                value={pct}
                aria-label={`Gastado en ${p.name}`}
                className={cn(
                  'h-1.5 bg-surface-sunk',
                  over ? '*:data-[slot=progress-indicator]:bg-alerta' : '*:data-[slot=progress-indicator]:bg-ink',
                )}
              />
            </li>
          );
        })}
      </ul>
    </HomeCard>
  );
}
