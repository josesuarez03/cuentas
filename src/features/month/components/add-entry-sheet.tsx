'use client';

import { useState } from 'react';
import type { PocketView } from '@/features/month/domain/month-view';
import { ToggleGroup, ToggleGroupItem } from '@/shared/components/ui/toggle-group';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/shared/components/ui/sheet';
import { DESKTOP_QUERY, useMediaQuery } from '@/shared/hooks/use-media-query';
import { cn } from '@/lib/utils';
import type { Catalog } from '@/features/catalog/server/catalog';
import { EntryForm } from './entry-form';
import { LoanForm } from './loan-form';
import { PocketExpenseForm } from './pocket-expense-form';

export type AddMode = 'expense' | 'income' | 'pocket' | 'loan';

const DESCRIPTIONS: Record<AddMode, string> = {
  expense: 'Solo para este mes. Lo que se repite irá en Recurrentes.',
  income: 'Solo para este mes. Lo que se repite irá en Recurrentes.',
  pocket: 'Se suma a lo gastado en la bolsa este mes.',
  loan: 'Cuenta como gasto este mes; cuando te lo devuelvan, márcalo como cobrado.',
};

const isMode = (value: string): value is AddMode => value === 'expense' || value === 'income' || value === 'pocket' || value === 'loan';

export function AddEntrySheet({ open, onOpenChange, ym, catalog, pockets = [], initialMode = 'expense', initialPocketId }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ym: string;
  catalog: Catalog;
  pockets?: PocketView[];
  initialMode?: AddMode;
  initialPocketId?: string;
}) {
  const desktop = useMediaQuery(DESKTOP_QUERY);
  const [requested, setRequested] = useState<AddMode>(initialMode);
  const [wasOpen, setWasOpen] = useState(open);
  // Al abrir se parte de `initialMode` en el mismo render, sin mostrar un instante el modo anterior.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setRequested(initialMode);
  }
  const mode: AddMode = requested === 'pocket' && pockets.length === 0 ? 'expense' : requested;

  const modes: { value: AddMode; label: string }[] = [
    { value: 'expense', label: 'Gasto' },
    { value: 'income', label: 'Ingreso' },
    ...(pockets.length > 0 ? [{ value: 'pocket' as const, label: 'Gasto de bolsa' }] : []),
    { value: 'loan', label: 'Préstamo' },
  ];
  const done = () => onOpenChange(false);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={desktop ? 'right' : 'bottom'}
        className={cn('overflow-y-auto shadow-sheet', !desktop && 'max-h-[90dvh] rounded-t-[14px]')}
      >
        <SheetHeader>
          <SheetTitle>Añadir al mes</SheetTitle>
          <SheetDescription>{DESCRIPTIONS[mode]}</SheetDescription>
        </SheetHeader>
        <ToggleGroup
          type="single"
          variant="outline"
          aria-label="Qué quieres añadir"
          className="mx-4 grid w-auto grid-cols-2 gap-2"
          value={mode}
          onValueChange={(value) => {
            // Radix permite deseleccionar (valor vacío): se ignora para que siempre haya un modo.
            if (isMode(value)) setRequested(value);
          }}
        >
          {modes.map((m) => (
            <ToggleGroupItem
              key={m.value}
              value={m.value}
              className={cn(
                'min-h-11 w-full rounded-sm text-[15px] font-medium data-[state=on]:bg-transparent',
                mode === m.value ? 'border-tinta text-tinta' : 'border-line text-ink',
              )}
            >
              {m.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        {(mode === 'expense' || mode === 'income') && <EntryForm key={mode} ym={ym} kind={mode} catalog={catalog} onDone={done} />}
        {mode === 'pocket' && <PocketExpenseForm ym={ym} pockets={pockets} defaultPocketId={initialPocketId} onDone={done} />}
        {mode === 'loan' && <LoanForm ym={ym} accounts={catalog.accounts} onDone={done} />}
      </SheetContent>
    </Sheet>
  );
}
