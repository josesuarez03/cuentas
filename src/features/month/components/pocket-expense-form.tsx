'use client';

import { useForm } from '@tanstack/react-form';
import { useAddPocketExpense } from '@/features/month/hooks/use-pocket-mutations';
import type { PocketView } from '@/features/month/domain/month-view';
import { Button } from '@/shared/components/ui/button';
import { parseEuros } from '@/lib/money';
import { SelectField, TextField } from './form-fields';

export function PocketExpenseForm({ ym, pockets, defaultPocketId, onDone }: {
  ym: string;
  pockets: PocketView[];
  defaultPocketId?: string;
  onDone: () => void;
}) {
  const add = useAddPocketExpense(ym);

  const form = useForm({
    defaultValues: { pocketId: defaultPocketId ?? pockets[0]?.id ?? '', amount: '', note: '' },
    onSubmit: ({ value }) => {
      add.mutate({ pocketId: value.pocketId, amountCents: parseEuros(value.amount) ?? 0, note: value.note.trim() || null });
      onDone();
    },
  });

  return (
    <form
      className="flex flex-col gap-4 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
    >
      <form.Field name="pocketId" validators={{ onSubmit: ({ value }) => (value ? undefined : 'Elige una bolsa.') }}>
        {(field) => <SelectField field={field} label="Bolsa" emptyText="Aún no tienes bolsas" options={pockets.map((p) => ({ value: p.id, label: p.name }))} />}
      </form.Field>

      <form.Field name="amount" validators={{ onSubmit: ({ value }) => (parseEuros(value) === null ? 'Escribe un importe, por ejemplo 52,00.' : undefined) }}>
        {(field) => <TextField field={field} label="Importe (€)" inputMode="decimal" />}
      </form.Field>

      <form.Field name="note" validators={{ onSubmit: ({ value }) => (value.trim().length > 80 ? 'Máximo 80 caracteres.' : undefined) }}>
        {(field) => <TextField field={field} label="Nota (opcional)" />}
      </form.Field>

      <Button type="submit" className="min-h-12 text-base">Apuntar gasto</Button>
    </form>
  );
}
