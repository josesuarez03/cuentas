'use client';

import { useForm } from '@tanstack/react-form';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { monthKey } from '@/features/month/hooks/use-month';
import { SAVE_ERROR } from '@/features/month/save-error';
import { lendMoneyAction } from '@/features/month/server/loan-actions';
import { wealthKey } from '@/features/wealth/domain/types';
import { Button } from '@/shared/components/ui/button';
import { parseEuros } from '@/lib/money';
import type { Catalog } from '@/features/catalog/server/catalog';
import { SelectField, TextField } from './form-fields';
import { useOnline } from '@/shared/hooks/use-online';

export function LoanForm({ ym, accounts, onDone }: {
  ym: string;
  accounts: Catalog['accounts'];
  onDone: () => void;
}) {
  const online = useOnline();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      person: '',
      amount: '',
      accountId: accounts.find((a) => a.type === 'checking')?.id ?? '',
      note: '',
    },
    onSubmit: async ({ value }) => {
      setError(null);
      try {
        const result = await lendMoneyAction({
          yearMonth: ym,
          person: value.person.trim(),
          amountCents: parseEuros(value.amount) ?? 0,
          accountId: value.accountId,
          note: value.note.trim() || null,
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        await Promise.all([
          qc.invalidateQueries({ queryKey: monthKey(ym) }),
          qc.invalidateQueries({ queryKey: wealthKey }),
        ]);
        onDone();
      } catch {
        setError(SAVE_ERROR);
      }
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
      <form.Field name="person" validators={{ onSubmit: ({ value }) => (value.trim() ? undefined : 'Escribe a quién le prestas.') }}>
        {(field) => <TextField field={field} label="¿A quién?" />}
      </form.Field>

      <form.Field name="amount" validators={{ onSubmit: ({ value }) => (parseEuros(value) === null ? 'Escribe un importe, por ejemplo 52,00.' : parseEuros(value)! <= 0 ? 'Escribe un importe mayor que 0.' : undefined) }}>
        {(field) => <TextField field={field} label="Importe (€)" inputMode="decimal" />}
      </form.Field>

      <form.Field name="accountId" validators={{ onSubmit: ({ value }) => (value ? undefined : 'Elige una cuenta.') }}>
        {(field) => <SelectField field={field} label="Cuenta" emptyText="Aún no tienes cuentas" options={accounts.map((a) => ({ value: a.id, label: a.name }))} />}
      </form.Field>

      <form.Field name="note">
        {(field) => <TextField field={field} label="Nota (opcional)" />}
      </form.Field>

      {error && <p role="alert" className="text-[13px] text-alerta">{error}</p>}

      <form.Subscribe selector={(state) => state.isSubmitting}>
        {(submitting) => (
          <>
            {accounts.length === 0 && (
              <p role="status" className="text-[13px] text-ink-muted">Para prestar necesitas al menos una cuenta.</p>
            )}
            <Button type="submit" className="min-h-12 text-base" disabled={submitting || accounts.length === 0 || !online}>
              {submitting ? 'Prestando…' : 'Prestar'}
            </Button>
          </>
        )}
      </form.Subscribe>
    </form>
  );
}
