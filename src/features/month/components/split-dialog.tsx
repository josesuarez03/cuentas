'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { setSavingsSplitAction } from '@/features/month/server/actions';
import { SAVE_ERROR } from '@/features/month/save-error';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import type { MonthView } from '@/features/month/domain/month-view';
import { cn } from '@/lib/utils';
import type { Catalog } from '@/features/catalog/server/catalog';

export function SplitDialog({ open, onOpenChange, ym, view, accounts }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ym: string;
  view: MonthView;
  accounts: Catalog['accounts'];
}) {
  const qc = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Se lee la última lista vía ref para reiniciar solo al abrir, no cuando cambian las identidades.
  const latest = useRef({ accounts, split: view.split });
  latest.current = { accounts, split: view.split };

  useEffect(() => {
    if (!open) return;
    const { accounts: accs, split } = latest.current;
    setError(null);
    setValues(Object.fromEntries(accs.map((a) => [a.id, String(split.find((s) => s.accountId === a.id)?.percent ?? 0)])));
  }, [open]);

  const total = Object.values(values).reduce((acc, v) => acc + (Number.parseInt(v, 10) || 0), 0);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const result = await setSavingsSplitAction(
        ym,
        Object.entries(values).map(([accountId, v]) => ({ accountId, percent: Number.parseInt(v, 10) || 0 })),
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      await qc.invalidateQueries({ queryKey: ['month', ym] });
      onOpenChange(false);
    } catch {
      setError(SAVE_ERROR);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reparto del ahorro</DialogTitle>
          <DialogDescription>Los meses siguientes empezarán con este reparto.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          {accounts.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-3">
              <Label htmlFor={`pct-${a.id}`} className="text-[15px] font-normal">{a.name}</Label>
              <div className="flex items-center gap-2">
                <Input
                  id={`pct-${a.id}`}
                  inputMode="numeric"
                  className="min-h-11 w-20 text-right"
                  value={values[a.id] ?? '0'}
                  onChange={(e) => setValues((v) => ({ ...v, [a.id]: e.target.value }))}
                />
                <span className="text-ink-muted">%</span>
              </div>
            </div>
          ))}
        </div>
        <p className={cn('text-[13px]', total === 100 ? 'text-ink-muted' : 'text-alerta')}>
          Total: {total} %{total !== 100 && ' (debe sumar 100 %)'}
        </p>
        {error && <p role="alert" className="text-[13px] text-alerta">{error}</p>}
        <DialogFooter>
          <Button className="min-h-11" disabled={total !== 100 || saving} onClick={save}>
            {saving ? 'Guardando…' : 'Guardar reparto'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
