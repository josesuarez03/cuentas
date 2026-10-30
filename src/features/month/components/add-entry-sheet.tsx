'use client';

import { useForm, type AnyFieldApi } from '@tanstack/react-form';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { addOneOffEntryAction } from '@/features/month/server/actions';
import { SAVE_ERROR } from '@/features/month/save-error';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/shared/components/ui/toggle-group';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/shared/components/ui/sheet';
import { DESKTOP_QUERY, useMediaQuery } from '@/shared/hooks/use-media-query';
import { parseEuros } from '@/lib/money';
import { cn } from '@/lib/utils';
import type { Catalog } from '@/features/catalog/server/catalog';

function FieldError({ field }: { field: AnyFieldApi }) {
  const [first] = field.state.meta.errors;
  return first ? <p role="alert" className="text-[13px] text-alerta">{String(first)}</p> : null;
}

function TextField({ field, label, inputMode }: { field: AnyFieldApi; label: string; inputMode?: 'decimal' }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={field.name}>{label}</Label>
      <Input
        id={field.name}
        className="min-h-11"
        inputMode={inputMode}
        value={field.state.value as string}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
        aria-invalid={field.state.meta.errors.length > 0}
      />
      <FieldError field={field} />
    </div>
  );
}

function SelectField({ field, label, options }: { field: AnyFieldApi; label: string; options: { value: string; label: string }[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={field.name}>{label}</Label>
      <Select
        value={field.state.value as string}
        onValueChange={(value) => field.handleChange(value)}
        onOpenChange={(open) => {
          if (!open) field.handleBlur();
        }}
      >
        <SelectTrigger
          id={field.name}
          className="min-h-11 w-full rounded-sm border-line bg-surface px-3 text-[15px] text-ink data-placeholder:text-ink-muted"
          aria-invalid={field.state.meta.errors.length > 0}
        >
          <SelectValue placeholder="Elige…" />
        </SelectTrigger>
        <SelectContent className="bg-surface text-ink">
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value} className="text-[15px]">{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FieldError field={field} />
    </div>
  );
}

export function AddEntrySheet({ open, onOpenChange, ym, catalog }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ym: string;
  catalog: Catalog;
}) {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const desktop = useMediaQuery(DESKTOP_QUERY);

  const form = useForm({
    defaultValues: {
      kind: 'expense' as 'income' | 'expense',
      name: '',
      amount: '',
      categoryId: '',
      accountId: catalog.accounts.find((a) => a.type === 'checking')?.id ?? '',
    },
    onSubmit: async ({ value }) => {
      setError(null);
      try {
        const result = await addOneOffEntryAction({
          yearMonth: ym,
          kind: value.kind,
          name: value.name.trim(),
          categoryId: value.categoryId,
          accountId: value.accountId,
          amountCents: parseEuros(value.amount) ?? 0,
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        await qc.invalidateQueries({ queryKey: ['month', ym] });
        form.reset();
        onOpenChange(false);
      } catch {
        setError(SAVE_ERROR);
      }
    },
  });

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setError(null);
        onOpenChange(next);
      }}
    >
      <SheetContent
        side={desktop ? 'right' : 'bottom'}
        className={cn('overflow-y-auto shadow-sheet', !desktop && 'max-h-[90dvh] rounded-t-[14px]')}
      >
        <SheetHeader>
          <SheetTitle>Añadir al mes</SheetTitle>
          <SheetDescription>Solo para este mes. Lo que se repite irá en Recurrentes.</SheetDescription>
        </SheetHeader>
        <form
          className="flex flex-col gap-4 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit();
          }}
        >
          <form.Field name="kind">
            {(field) => (
              <ToggleGroup
                type="single"
                variant="outline"
                aria-label="Tipo"
                className="grid w-full grid-cols-2 gap-2"
                value={field.state.value}
                onValueChange={(value) => {
                  // Radix permite deseleccionar (valor vacío): se ignora para que siempre haya un tipo.
                  if (value !== 'expense' && value !== 'income') return;
                  field.handleChange(value);
                  form.setFieldValue('categoryId', '');
                }}
              >
                {(['expense', 'income'] as const).map((k) => (
                  <ToggleGroupItem
                    key={k}
                    value={k}
                    className={cn(
                      'min-h-11 w-full rounded-sm text-[15px] font-medium data-[state=on]:bg-transparent',
                      field.state.value === k ? 'border-tinta text-tinta' : 'border-line text-ink',
                    )}
                  >
                    {k === 'expense' ? 'Gasto' : 'Ingreso'}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            )}
          </form.Field>

          <form.Field name="name" validators={{ onSubmit: ({ value }) => (value.trim() ? undefined : 'Escribe un nombre, por ejemplo «Regalo de cumpleaños».') }}>
            {(field) => <TextField field={field} label="Nombre" />}
          </form.Field>

          <form.Field name="amount" validators={{ onSubmit: ({ value }) => (parseEuros(value) === null ? 'Escribe un importe, por ejemplo 52,00.' : undefined) }}>
            {(field) => <TextField field={field} label="Importe (€)" inputMode="decimal" />}
          </form.Field>

          <form.Subscribe selector={(state) => state.values.kind}>
            {(kind) => (
              <form.Field name="categoryId" validators={{ onSubmit: ({ value }) => (value ? undefined : 'Elige una categoría.') }}>
                {(field) => (
                  <SelectField
                    field={field}
                    label="Categoría"
                    options={catalog.categories.filter((c) => c.kind === kind).map((c) => ({ value: c.id, label: c.name }))}
                  />
                )}
              </form.Field>
            )}
          </form.Subscribe>

          <form.Field name="accountId" validators={{ onSubmit: ({ value }) => (value ? undefined : 'Elige una cuenta.') }}>
            {(field) => <SelectField field={field} label="Cuenta" options={catalog.accounts.map((a) => ({ value: a.id, label: a.name }))} />}
          </form.Field>

          {error && <p role="alert" className="text-[13px] text-alerta">{error}</p>}

          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(submitting) => (
              <Button type="submit" className="min-h-12 text-base" disabled={submitting}>
                {submitting ? 'Añadiendo…' : 'Añadir'}
              </Button>
            )}
          </form.Subscribe>
        </form>
      </SheetContent>
    </Sheet>
  );
}
