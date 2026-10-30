'use client';

import { useForm } from '@tanstack/react-form';
import { useState } from 'react';
import { SelectField, TextField } from '@/features/month/components/form-fields';
import { parseEuros } from '@/lib/money';
import { ACCOUNT_TYPE_LABEL, type SettingsAccount } from '@/features/settings/domain/types';
import { useSettingsAction } from '@/features/settings/hooks/use-settings';
import { createAccountAction, updateAccountAction } from '@/features/settings/server/general-actions';
import type { AccountType } from '@/features/wealth/domain/types';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { SettingsSection } from './settings-section';

const TYPE_OPTIONS = (Object.keys(ACCOUNT_TYPE_LABEL) as AccountType[]).map((t) => ({ value: t, label: ACCOUNT_TYPE_LABEL[t] }));

function AccountForm({ account, onDone }: { account: SettingsAccount | null; onDone: () => void }) {
  const create = useSettingsAction(createAccountAction);
  const update = useSettingsAction((v: { name: string; bank: string; type: AccountType }) => updateAccountAction(account?.id ?? '', v));
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      name: account?.name ?? '',
      bank: account?.bank ?? '',
      type: (account?.type ?? 'checking') as AccountType,
      balance: '',
    },
    onSubmit: async ({ value }) => {
      setError(null);
      const base = { name: value.name.trim(), bank: value.bank.trim(), type: value.type };
      try {
        if (account) {
          await update.mutateAsync(base);
        } else {
          const cents = value.balance.trim() === '' ? null : parseEuros(value.balance);
          await create.mutateAsync({
            ...base,
            balanceCents: cents === null ? null : value.type === 'credit_card' ? -cents : cents,
          });
        }
        onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se ha guardado.');
      }
    },
  });

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
    >
      <form.Field name="name" validators={{ onSubmit: ({ value }) => (value.trim() ? undefined : 'Escribe un nombre.') }}>
        {(field) => <TextField field={field} label="Nombre" />}
      </form.Field>
      <form.Field name="bank">
        {(field) => <TextField field={field} label="Banco" />}
      </form.Field>
      <form.Field name="type">
        {(field) => <SelectField field={field} label="Tipo" options={TYPE_OPTIONS} emptyText="Sin tipos" />}
      </form.Field>
      {!account && (
        <form.Subscribe selector={(s) => s.values.type}>
          {(type) => (
            <form.Field
              name="balance"
              validators={{ onSubmit: ({ value }) => (value.trim() === '' || parseEuros(value) !== null ? undefined : 'Escribe un importe, por ejemplo 1.200,00.') }}
            >
              {(field) => (
                <TextField
                  field={field}
                  label={type === 'credit_card' ? 'Lo que debes (€)' : 'Saldo de hoy (€)'}
                  inputMode="decimal"
                />
              )}
            </form.Field>
          )}
        </form.Subscribe>
      )}
      {error && <p role="alert" className="text-[13px] text-alerta">{error}</p>}
      <Button type="submit" className="min-h-11" disabled={create.isPending || update.isPending}>Guardar</Button>
    </form>
  );
}

export function AccountsSection({ accounts }: { accounts: SettingsAccount[] }) {
  const [editing, setEditing] = useState<SettingsAccount | 'new' | null>(null);

  return (
    <SettingsSection
      id="ajustes-cuentas"
      title="Cuentas"
      action={<Button variant="outline" className="min-h-11 text-[15px]" onClick={() => setEditing('new')}>Añadir cuenta</Button>}
    >
      <ul className="divide-y divide-line">
        {accounts.map((a) => (
          <li key={a.id} className="flex min-h-11 items-center justify-between gap-3 py-1">
            <div className="min-w-0">
              <p className="truncate text-[15px] text-ink">{a.name}</p>
              <p className="truncate text-[13px] text-ink-muted">{[ACCOUNT_TYPE_LABEL[a.type], a.bank].filter(Boolean).join(' · ')}</p>
            </div>
            <Button variant="ghost" className="min-h-11 text-[15px]" aria-label={`Editar ${a.name}`} onClick={() => setEditing(a)}>Editar</Button>
          </li>
        ))}
      </ul>
      <Dialog open={editing !== null} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing === 'new' ? 'Añadir cuenta' : 'Editar cuenta'}</DialogTitle>
            <DialogDescription className="sr-only">Datos de la cuenta</DialogDescription>
          </DialogHeader>
          {editing !== null && (
            <AccountForm
              key={editing === 'new' ? 'new' : editing.id}
              account={editing === 'new' ? null : editing}
              onDone={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </SettingsSection>
  );
}
