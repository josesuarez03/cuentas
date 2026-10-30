'use client';

import { useRef, useState } from 'react';
import { formatAmountInput, parseEuros } from '@/lib/money';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';

function IncomeForm({ entry, onSubmitAmount, onCancel }: {
  entry: { amountCents: number };
  onSubmitAmount: (amountCents: number) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState(() => formatAmountInput(entry.amountCents));
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const c = parseEuros(text);
    if (c === null || c <= 0) {
      setError('Escribe un importe, por ejemplo 1.790,00.');
      return;
    }
    onSubmitAmount(c);
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={submit}>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirm-income-amount">Importe recibido (€)</Label>
        <Input
          id="confirm-income-amount"
          className="min-h-11 tabular-nums"
          inputMode="decimal"
          autoFocus
          onFocus={(e) => e.currentTarget.select()}
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-invalid={error !== null}
        />
        {error && <p role="alert" className="text-[13px] text-alerta">{error}</p>}
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" className="min-h-11" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" className="min-h-11">Confirmar</Button>
      </div>
    </form>
  );
}

export function ConfirmIncomeDialog({ entry, open, onOpenChange, onConfirm, returnFocusTo }: {
  entry: { id: string; name: string; amountCents: number } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (amountCents: number) => void;
  returnFocusTo?: () => HTMLElement | null;
}) {
  const confirmed = useRef(false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onCloseAutoFocus={(e) => {
          if (confirmed.current && returnFocusTo) {
            e.preventDefault();
            returnFocusTo()?.focus();
          }
          confirmed.current = false;
        }}
      >
        <DialogHeader>
          <DialogTitle>Confirmar {entry?.name}</DialogTitle>
          <DialogDescription>
            ¿Cuánto te ha llegado? Si es distinto de lo previsto, cámbialo: los meses siguientes partirán de este importe.
          </DialogDescription>
        </DialogHeader>
        {entry && (
          <IncomeForm
            key={entry.id}
            entry={entry}
            onCancel={() => onOpenChange(false)}
            onSubmitAmount={(c) => {
              confirmed.current = true;
              onConfirm(c);
              onOpenChange(false);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
