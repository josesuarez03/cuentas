import type { AccountBalance } from '@/features/wealth/domain/types';
import { formatEuros } from '@/lib/money';
import { formatShortDate } from '@/lib/year-month';
import { Button } from '@/shared/components/ui/button';

export function AccountList({ accounts, onUpdate }: { accounts: AccountBalance[]; onUpdate: (a: AccountBalance) => void }) {
  return (
    <ul>
      {accounts.map((a) => (
        <li key={a.accountId} className="flex min-h-16 items-center gap-3 border-t border-line py-3">
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-medium">{a.name}</p>
            <p className="text-[13px] text-ink-muted tabular-nums">
              {a.realCents !== null && a.realDate
                ? `Saldo real ${formatEuros(a.realCents)} · a ${formatShortDate(new Date(a.realDate))}`
                : 'Sin saldo todavía'}
            </p>
            {a.diffCents !== null && a.diffCents !== 0 && (
              <p className="text-[13px] text-ink-muted tabular-nums">Diferencia {formatEuros(a.diffCents, { sign: true })}</p>
            )}
            {a.stale && <p className="text-[13px] text-aviso">Hace más de 30 días</p>}
          </div>
          <div className="flex shrink-0 flex-col items-end">
            <p className="text-[15px] font-semibold tabular-nums">
              <span className="sr-only">Estimado: </span>
              {a.estimatedCents !== null ? formatEuros(a.estimatedCents) : '—'}
            </p>
            <Button
              variant="ghost"
              className="min-h-11 text-tinta"
              aria-label={`Actualizar saldo de ${a.name}`}
              onClick={() => onUpdate(a)}
            >
              Actualizar
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
