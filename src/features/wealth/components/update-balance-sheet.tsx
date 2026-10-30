'use client';

import { useEffect, useState } from 'react';
import type { AccountBalance } from '@/features/wealth/domain/types';
import { formatAmountInput, parseEuros } from '@/lib/money';
import { cn } from '@/lib/utils';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/shared/components/ui/sheet';
import { DESKTOP_QUERY, useMediaQuery } from '@/shared/hooks/use-media-query';

export function UpdateBalanceSheet({ account, open, onOpenChange, onSave }: {
  account: AccountBalance | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (balanceCents: number) => void;
}) {
  const desktop = useMediaQuery(DESKTOP_QUERY);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const accountId = account?.accountId;

  useEffect(() => {
    if (!open || !account) return;
    setValue(formatAmountInput(Math.abs(account.estimatedCents ?? account.realCents ?? 0)));
    setError(null);
    // Precarga solo al abrir o al cambiar de cuenta, no en cada refresco de datos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, accountId]);

  const isCard = account?.type === 'credit_card';
  const label = isCard ? 'Lo que debes (€)' : 'Saldo de hoy (€)';

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const cents = parseEuros(value);
    if (cents === null) {
      setError('Escribe un importe, por ejemplo 1.250,00.');
      return;
    }
    onSave(isCard ? -cents : cents);
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={desktop ? 'right' : 'bottom'}
        className={cn('overflow-y-auto shadow-sheet', !desktop && 'max-h-[90dvh] rounded-t-[14px]')}
      >
        <SheetHeader>
          <SheetTitle>Actualizar saldo</SheetTitle>
          <SheetDescription>{account?.name}</SheetDescription>
        </SheetHeader>
        <form className="flex flex-col gap-4 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]" onSubmit={submit}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="balance-amount">{label}</Label>
            <Input
              id="balance-amount"
              className="min-h-11"
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              aria-invalid={error !== null}
            />
            {error && <p role="alert" className="text-[13px] text-alerta">{error}</p>}
          </div>
          <Button type="submit" className="min-h-12 text-base">Actualizar saldo</Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
