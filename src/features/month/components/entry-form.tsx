'use client';

import { useForm } from '@tanstack/react-form';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { addOneOffEntryAction } from '@/features/month/server/actions';
import { wealthKey } from '@/features/wealth/domain/types';
import { SAVE_ERROR } from '@/features/month/save-error';
import { Button } from '@/shared/components/ui/button';
import { parseEuros } from '@/lib/money';
import type { Catalog } from '@/features/catalog/server/catalog';
import { SelectField, TextField } from './form-fields';
import { useOnline } from '@/shared/hooks/use-online';

export function EntryForm({ ym, kind, catalog, onDone }: {
  ym: string;
  kind: 'income' | 'expense';
  catalog: Catalog;
  onDone: () => void;
}) {
  const online = useOnline();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
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
          kind,
          name: value.name.trim(),
          categoryId: value.categoryId,
          accountId: value.accountId,
          amountCents: parseEuros(value.amount) ?? 0,
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        await Promise.all([
          qc.invalidateQueries({ queryKey: ['month', ym] }),
          qc.invalidateQueries({ queryKey: wealthKey }),
        ]);
        form.reset();
        onDone();
      } catch {
        setError(SAVE_ERROR);
      }
    },
  });

  const missing = catalog.accounts.length === 0 || !catalog.categories.some((c) => c.kind === kind);

  return (
    <form
      className="flex flex-col gap-4 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
    >
      <form.Field name="name" validators={{ onSubmit: ({ value }) => (value.trim() ? undefined : 'Escribe un nombre, por ejemplo «Regalo de cumpleaños».') }}>
        {(field) => <TextField field={field} label="Nombre" />}
      </form.Field>

      <form.Field name="amount" validators={{ onSubmit: ({ value }) => (parseEuros(value) === null ? 'Escribe un importe, por ejemplo 52,00.' : undefined) }}>
        {(field) => <TextField field={field} label="Importe (€)" inputMode="decimal" />}
      </form.Field>

      <form.Field name="categoryId" validators={{ onSubmit: ({ value }) => (value ? undefined : 'Elige una categoría.') }}>
        {(field) => (
          <SelectField
            field={field}
            label="Categoría"
            emptyText={`Aún no tienes categorías de ${kind === 'income' ? 'ingreso' : 'gasto'}`}
            options={catalog.categories.filter((c) => c.kind === kind).map((c) => ({ value: c.id, label: c.name }))}
          />
        )}
      </form.Field>

      <form.Field name="accountId" validators={{ onSubmit: ({ value }) => (value ? undefined : 'Elige una cuenta.') }}>
        {(field) => <SelectField field={field} label="Cuenta" emptyText="Aún no tienes cuentas" options={catalog.accounts.map((a) => ({ value: a.id, label: a.name }))} />}
      </form.Field>

      {error && <p role="alert" className="text-[13px] text-alerta">{error}</p>}

      <form.Subscribe selector={(state) => state.isSubmitting}>
        {(submitting) => (
          <>
            {missing && (
              <p role="status" className="text-[13px] text-ink-muted">
                Para añadir partidas necesitas al menos una categoría y una cuenta.
              </p>
            )}
            <Button type="submit" className="min-h-12 text-base" disabled={submitting || missing || !online}>
              {submitting ? 'Añadiendo…' : 'Añadir'}
            </Button>
          </>
        )}
      </form.Subscribe>
    </form>
  );
}
