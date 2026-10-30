'use client';

import { useState } from 'react';
import type { AccountBalance } from '@/features/wealth/domain/types';
import { formatAmountInput, parseEuros } from '@/lib/money';
import { cn } from '@/lib/utils';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/shared/components/ui/sheet';
import { DESKTOP_QUERY, useMediaQuery } from '@/shared/hooks/use-media-query';
import { useOnline } from '@/shared/hooks/use-online';

const MINUS = '\u2212';

function initialValue(account: AccountBalance): string {
  const cents = account.estimatedCents ?? account.realCents ?? 0;
  const text = formatAmountInput(Math.abs(cents));
  return account.type !== 'credit_card' && cents < 0 ? `${MINUS}${text}` : text;
}

function BalanceForm({ account, onSave, onDone }: {
  account: AccountBalance;
  onSave: (balanceCents: number) => void;
  onDone: () => void;
}) {
  const online = useOnline();
  const [value, setValue] = useState(() => initialValue(account));
  const [error, setError] = useState<string | null>(null);
  const isCard = account.type === 'credit_card';

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    const negative = !isCard && /^[-\u2212]/.test(trimmed);
    const cents = parseEuros(negative ? trimmed.slice(1).trim() : trimmed);
    if (cents === null) {
      setError('Escribe un importe, por ejemplo 1.250,00.');
      return;
    }
    onSave(isCard || negative ? -cents : cents);
    onDone();
  }

  return (
    <form className="flex flex-col gap-4 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]" onSubmit={submit}>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="balance-amount">{isCard ? 'Lo que debes (€)' : 'Saldo de hoy (€)'}</Label>
        <Input
          id="balance-amount"
          className="min-h-11"
          inputMode="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-invalid={error !== null}
          aria-describedby={isCard ? undefined : 'balance-hint'}
        />
        {!isCard && <p id="balance-hint" className="text-[13px] text-ink-muted">Si estás en descubierto, empieza con {MINUS}.</p>}
        {error && <p role="alert" className="text-[13px] text-alerta">{error}</p>}
      </div>
      <Button type="submit" className="min-h-12 text-base" disabled={!online}>Actualizar saldo</Button>
    </form>
  );
}

export function UpdateBalanceSheet({ account, open, onOpenChange, onSave }: {
  account: AccountBalance | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (balanceCents: number) => void;
}) {
  const desktop = useMediaQuery(DESKTOP_QUERY);
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
        {account && <BalanceForm key={account.accountId} account={account} onSave={onSave} onDone={() => onOpenChange(false)} />}
      </SheetContent>
    </Sheet>
  );
}
