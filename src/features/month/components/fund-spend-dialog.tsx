'use client';

import { useEffect, useState } from 'react';
import { useSpendFromFund } from '@/features/month/hooks/use-pocket-mutations';
import type { FundView } from '@/features/month/domain/month-view';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { formatEuros, parseEuros } from '@/lib/money';
import { useOnline } from '@/shared/hooks/use-online';

export function FundSpendDialog({ open, onOpenChange, ym, fund }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ym: string;
  fund: FundView | null;
}) {
  const online = useOnline();
  const spend = useSpendFromFund(ym);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setAmount('');
    setNote('');
    setError(null);
  }, [open]);

  function submit() {
    if (!fund) return;
    const cents = parseEuros(amount);
    if (cents === null || cents <= 0) {
      setError('Escribe un importe, por ejemplo 52,00.');
      return;
    }
    if (cents > fund.balanceCents) {
      setError(`La hucha solo tiene ${formatEuros(fund.balanceCents)}.`);
      return;
    }
    spend.mutate({ fundId: fund.id, amountCents: cents, note: note.trim() || null });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <DialogHeader>
            <DialogTitle>Gastar de la hucha</DialogTitle>
            <DialogDescription>
              {fund ? `${fund.name}: tienes ${formatEuros(fund.balanceCents)}. No cuenta como gasto del mes.` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fund-spend-amount">Importe (€)</Label>
            <Input
              id="fund-spend-amount"
              className="min-h-11"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              aria-invalid={error !== null}
            />
            {error && <p role="alert" className="text-[13px] text-alerta">{error}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fund-spend-note">Nota (opcional)</Label>
            <Input id="fund-spend-note" className="min-h-11" maxLength={80} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="min-h-11" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" className="min-h-11" disabled={!online}>Gastar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
