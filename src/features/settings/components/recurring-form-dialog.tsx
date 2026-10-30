'use client';

import { useForm } from '@tanstack/react-form';
import { useState } from 'react';
import { FieldError, SelectField, TextField } from '@/features/month/components/form-fields';
import { formatAmountInput, parseEuros } from '@/lib/money';
import { cn } from '@/lib/utils';
import { currentYearMonth, formatMonthNameOnly } from '@/lib/year-month';
import { recurringInputSchema, type RecurringInput } from '@/features/settings/domain/recurring-schema';
import { FREQUENCY_LABEL } from '@/features/settings/domain/recurring-view';
import type { Frequency, SettingsRecurring, SettingsView } from '@/features/settings/domain/types';
import { useSettingsAction } from '@/features/settings/hooks/use-settings';
import { createRecurringAction, updateRecurringAction } from '@/features/settings/server/templates-actions';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/shared/components/ui/toggle-group';

type Kind = 'expense' | 'income';
const KIND_LABEL: Record<Kind, string> = { expense: 'Gasto', income: 'Ingreso' };
const FREQUENCY_OPTIONS = (Object.keys(FREQUENCY_LABEL) as Frequency[]).map((f) => ({ value: f, label: FREQUENCY_LABEL[f] }));
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: formatMonthNameOnly(`2000-${String(i + 1).padStart(2, '0')}`),
}));

interface FormValues {
  kind: Kind; name: string; amount: string; categoryId: string; accountId: string; frequency: Frequency;
  anchorMonth: string; installmentsTotal: string; startMonth: string; paydayDay: string;
}

const FIELD_OF_PATH: Record<string, keyof FormValues> = {
  name: 'name', kind: 'kind', categoryId: 'categoryId', accountId: 'accountId', amountCents: 'amount',
  frequency: 'frequency', startMonth: 'startMonth', anchorMonth: 'anchorMonth',
  installmentsTotal: 'installmentsTotal', paydayDay: 'paydayDay',
};
const FIELD_MESSAGE: Partial<Record<keyof FormValues, string>> = {
  name: 'Escribe un nombre.',
  categoryId: 'Elige una categoría.',
  accountId: 'Elige una cuenta.',
  amount: 'Escribe un importe, por ejemplo 60,00.',
  startMonth: 'Elige un mes.',
  anchorMonth: 'Elige el mes en que se cobra.',
  installmentsTotal: 'Indica el número de cuotas (de 2 a 120).',
  paydayDay: 'Escribe un día del 1 al 31.',
};

function toNumber(text: string): number | null {
  const t = text.trim();
  return /^\d+$/.test(t) ? Number.parseInt(t, 10) : null;
}

function toInput(v: FormValues): { input: RecurringInput } | { errors: Partial<Record<keyof FormValues, string>> } {
  const errors: Partial<Record<keyof FormValues, string>> = {};
  const amountCents = parseEuros(v.amount);
  const optional = (text: string, field: keyof FormValues) => {
    if (text.trim() === '') return null;
    const n = toNumber(text);
    if (n === null) errors[field] = FIELD_MESSAGE[field];
    return n;
  };
  const candidate = {
    name: v.name,
    kind: v.kind,
    categoryId: v.categoryId,
    accountId: v.accountId,
    amountCents: amountCents ?? 0,
    frequency: v.frequency,
    startMonth: v.startMonth,
    anchorMonth: v.frequency === 'annual' ? optional(v.anchorMonth, 'anchorMonth') : null,
    installmentsTotal: v.frequency === 'installments' ? optional(v.installmentsTotal, 'installmentsTotal') : null,
    paydayDay: v.kind === 'income' ? optional(v.paydayDay, 'paydayDay') : null,
  };
  const parsed = recurringInputSchema.safeParse(candidate);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = FIELD_OF_PATH[String(issue.path[0])];
      if (field && !errors[field]) errors[field] = issue.code === 'custom' ? issue.message : FIELD_MESSAGE[field];
    }
  }
  if (Object.keys(errors).length > 0 || !parsed.success) return { errors };
  return { input: parsed.data };
}

function RecurringForm({ item, settings, onDone }: { item: SettingsRecurring | null; settings: SettingsView; onDone: () => void }) {
  const create = useSettingsAction(createRecurringAction);
  const update = useSettingsAction((v: RecurringInput) => updateRecurringAction(item?.id ?? '', v));
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      kind: (item?.kind ?? 'expense') as Kind,
      name: item?.name ?? '',
      amount: item ? formatAmountInput(item.amountCents) : '',
      categoryId: item?.categoryId ?? '',
      accountId: item?.accountId ?? settings.accounts[0]?.id ?? '',
      frequency: (item?.frequency ?? 'monthly') as Frequency,
      anchorMonth: item?.anchorMonth ? String(item.anchorMonth) : '',
      installmentsTotal: item?.installmentsTotal ? String(item.installmentsTotal) : '',
      startMonth: item?.startMonth ?? currentYearMonth(),
      paydayDay: item?.paydayDay ? String(item.paydayDay) : '',
    } as FormValues,
    validators: {
      onSubmit: ({ value }) => {
        const result = toInput(value);
        return 'errors' in result ? { fields: result.errors } : undefined;
      },
    },
    onSubmit: async ({ value }) => {
      setError(null);
      const result = toInput(value);
      if ('errors' in result) return;
      try {
        if (item) await update.mutateAsync(result.input);
        else await create.mutateAsync(result.input);
        onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se ha guardado.');
      }
    },
  });

  function categoryOptions(kind: Kind) {
    const ofKind = settings.categories.filter((c) => c.kind === kind);
    const byId = new Map(ofKind.map((c) => [c.id, c]));
    return ofKind
      .map((c) => {
        const parent = c.parentId ? byId.get(c.parentId) : undefined;
        return { value: c.id, label: parent ? `${parent.name} › ${c.name}` : c.name };
      })
      .sort((a, b) => a.label.localeCompare(b.label, 'es'));
  }

  return (
    <form
      className="flex max-h-[70dvh] flex-col gap-4 overflow-y-auto px-0.5 py-0.5"
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
    >
      <form.Field name="kind" listeners={{ onChange: () => form.setFieldValue('categoryId', '') }}>
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <Label id="recurrente-tipo">Tipo</Label>
            <ToggleGroup
              type="single"
              variant="outline"
              aria-labelledby="recurrente-tipo"
              className="grid w-full grid-cols-2 gap-2"
              value={field.state.value}
              onValueChange={(v) => { if (v) field.handleChange(v as Kind); }}
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
                  {KIND_LABEL[k]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        )}
      </form.Field>
      <form.Field name="name">{(field) => <TextField field={field} label="Nombre" />}</form.Field>
      <form.Field name="amount">{(field) => <TextField field={field} label="Importe (€)" inputMode="decimal" />}</form.Field>
      <form.Subscribe selector={(s) => s.values.kind}>
        {(kind) => (
          <form.Field name="categoryId">
            {(field) => <SelectField field={field} label="Categoría" options={categoryOptions(kind)} emptyText="Sin categorías" />}
          </form.Field>
        )}
      </form.Subscribe>
      <form.Field name="accountId">
        {(field) => (
          <SelectField
            field={field}
            label="Cuenta"
            options={settings.accounts.map((a) => ({ value: a.id, label: a.name }))}
            emptyText="Sin cuentas"
          />
        )}
      </form.Field>
      <form.Field name="frequency">
        {(field) => <SelectField field={field} label="Frecuencia" options={FREQUENCY_OPTIONS} emptyText="Sin frecuencias" />}
      </form.Field>
      <form.Subscribe selector={(s) => s.values.frequency}>
        {(frequency) => (
          <>
            {frequency === 'annual' && (
              <form.Field name="anchorMonth">
                {(field) => <SelectField field={field} label="Mes de cobro" options={MONTH_OPTIONS} emptyText="Sin meses" />}
              </form.Field>
            )}
            {frequency === 'installments' && (
              <form.Field name="installmentsTotal">
                {(field) => <TextField field={field} label="Número de cuotas" inputMode="numeric" />}
              </form.Field>
            )}
          </>
        )}
      </form.Subscribe>
      <form.Field name="startMonth">
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={field.name}>Empieza en</Label>
            <Input
              id={field.name}
              type="month"
              className="min-h-11"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              aria-invalid={field.state.meta.errors.length > 0}
            />
            <FieldError field={field} />
          </div>
        )}
      </form.Field>
      <form.Subscribe selector={(s) => s.values.kind}>
        {(kind) => kind === 'income' && (
          <form.Field name="paydayDay">
            {(field) => <TextField field={field} label="Día de cobro (opcional)" inputMode="numeric" />}
          </form.Field>
        )}
      </form.Subscribe>
      {error && <p role="alert" className="text-[13px] text-alerta">{error}</p>}
      <Button type="submit" className="min-h-11" disabled={create.isPending || update.isPending}>Guardar</Button>
    </form>
  );
}

export function RecurringFormDialog({ open, onOpenChange, item, settings }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: SettingsRecurring | null;
  settings: SettingsView;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? 'Editar partida' : 'Añadir partida'}</DialogTitle>
          <DialogDescription className="sr-only">Datos de la partida recurrente</DialogDescription>
        </DialogHeader>
        {open && (
          <RecurringForm key={item?.id ?? 'new'} item={item} settings={settings} onDone={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}
