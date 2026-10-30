'use client';

import { useRef, useState } from 'react';
import { formatAmountInput, formatEuros, parseEuros } from '@/lib/money';
import { cn } from '@/lib/utils';
import { Input } from '@/shared/components/ui/input';

interface Props {
  cents: number;
  label: string;
  sign: 1 | -1;
  onSave: (cents: number) => void;
}

export function AmountEditor({ cents, label, sign, onSave }: Props) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const cancelled = useRef(false);

  function start() {
    cancelled.current = false;
    setValue(formatAmountInput(cents));
    setError(null);
    setEditing(true);
  }

  function commit() {
    if (cancelled.current) return;
    const parsed = parseEuros(value);
    if (parsed === null) {
      setError('Escribe un importe, por ejemplo 52,00');
      return;
    }
    cancelled.current = true;
    setEditing(false);
    if (parsed !== cents) onSave(parsed);
  }

  if (!editing) {
    return (
      <button
        type="button"
        aria-label={`Editar importe de ${label}`}
        onClick={start}
        className={cn(
          '-mr-1 min-h-11 rounded-sm px-1 text-[15px] font-medium',
          sign > 0 ? 'text-positivo' : 'text-ink',
        )}
      >
        {formatEuros(sign * cents, { sign: true })}
      </button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Input
        autoFocus
        aria-label={`Importe de ${label}`}
        aria-invalid={error !== null}
        inputMode="decimal"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') {
            cancelled.current = true;
            setEditing(false);
          }
        }}
        onBlur={commit}
        className="min-h-10 w-28 rounded-sm border-tinta bg-surface-sunk px-2.5 text-right text-[15px] font-medium tabular-nums"
      />
      {error && <span role="alert" className="text-[13px] text-alerta">{error}</span>}
    </div>
  );
}
