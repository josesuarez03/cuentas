'use client';

import { useState } from 'react';
import { SAVINGS_TARGET, type SettingsAccount } from '@/features/settings/domain/types';
import { useSettingsAction } from '@/features/settings/hooks/use-settings';
import { setDefaultSplitAction } from '@/features/settings/server/general-actions';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { cn } from '@/lib/utils';
import { SettingsSection } from './settings-section';

export function SplitSection({ accounts }: { accounts: SettingsAccount[] }) {
  const targets = accounts.filter((a) => SAVINGS_TARGET(a.type));
  const save = useSettingsAction(setDefaultSplitAction);
  const [values, setValues] = useState<Record<string, string>>(
    () => Object.fromEntries(targets.map((a) => [a.id, String(a.defaultSavingsPercent)])),
  );
  const [error, setError] = useState<string | null>(null);
  const total = targets.reduce((acc, a) => acc + (Number.parseInt(values[a.id] ?? '', 10) || 0), 0);

  async function onSave() {
    setError(null);
    try {
      await save.mutateAsync(targets.map((a) => ({ accountId: a.id, percent: Number.parseInt(values[a.id] ?? '', 10) || 0 })));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se ha guardado.');
    }
  }

  return (
    <SettingsSection
      id="ajustes-reparto"
      title="Reparto del ahorro"
      description="Así se reparte el ahorro de los meses nuevos y de este mes."
    >
      <div className="flex flex-col gap-3 py-3">
        {targets.map((a) => (
          <div key={a.id} className="flex items-center justify-between gap-3">
            <Label htmlFor={`split-${a.id}`} className="text-[15px] font-normal">{a.name}</Label>
            <div className="flex items-center gap-2">
              <Input
                id={`split-${a.id}`}
                inputMode="numeric"
                className="min-h-11 w-20 text-right"
                value={values[a.id] ?? '0'}
                onChange={(e) => setValues((v) => ({ ...v, [a.id]: e.target.value }))}
              />
              <span className="text-ink-muted">%</span>
            </div>
          </div>
        ))}
        <p className={cn('text-[13px]', total === 100 ? 'text-ink-muted' : 'text-alerta')}>
          Total: {total} %{total !== 100 && ' (debe sumar 100 %)'}
        </p>
        {error && <p role="alert" className="text-[13px] text-alerta">{error}</p>}
        <Button className="min-h-11 self-start" disabled={total !== 100 || save.isPending} onClick={() => void onSave()}>Guardar</Button>
      </div>
    </SettingsSection>
  );
}
