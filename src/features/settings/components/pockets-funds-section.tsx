'use client';

import { useForm } from '@tanstack/react-form';
import { useState } from 'react';
import { SelectField, TextField } from '@/features/month/components/form-fields';
import type { SettingsAccount, SettingsFund, SettingsPocket, SettingsView } from '@/features/settings/domain/types';
import { useSettingsAction } from '@/features/settings/hooks/use-settings';
import {
  createFundAction, createPocketAction, updateFundAction, updatePocketAction,
} from '@/features/settings/server/templates-actions';
import { formatAmountInput, formatEuros, parseEuros } from '@/lib/money';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { SettingsSection } from './settings-section';

interface Entry { id: string; name: string; accountId: string; cents: number }
interface Payload { name: string; accountId: string; cents: number }

function EntryForm({ entry, accounts, amountLabel, save, onDone }: {
  entry: Entry | null;
  accounts: SettingsAccount[];
  amountLabel: string;
  save: (v: Payload) => Promise<unknown>;
  onDone: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const form = useForm({
    defaultValues: {
      name: entry?.name ?? '',
      accountId: entry?.accountId ?? accounts[0]?.id ?? '',
      amount: entry ? formatAmountInput(entry.cents) : '',
    },
    onSubmit: async ({ value }) => {
      setError(null);
      setPending(true);
      try {
        await save({ name: value.name.trim(), accountId: value.accountId, cents: parseEuros(value.amount) ?? 0 });
        onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se ha guardado.');
      } finally {
        setPending(false);
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
      <form.Field name="accountId" validators={{ onSubmit: ({ value }) => (value ? undefined : 'Elige una cuenta.') }}>
        {(field) => (
          <SelectField
            field={field}
            label="Cuenta"
            options={accounts.map((a) => ({ value: a.id, label: a.name }))}
            emptyText="Sin cuentas"
          />
        )}
      </form.Field>
      <form.Field
        name="amount"
        validators={{
          onSubmit: ({ value }) => {
            const cents = parseEuros(value);
            return cents !== null && cents >= 0 ? undefined : 'Escribe un importe, por ejemplo 50,00.';
          },
        }}
      >
        {(field) => <TextField field={field} label={amountLabel} inputMode="decimal" />}
      </form.Field>
      {error && <p role="alert" className="text-[13px] text-alerta">{error}</p>}
      <Button type="submit" className="min-h-11" disabled={pending}>Guardar</Button>
    </form>
  );
}

interface ListProps {
  id: string;
  title: string;
  description: string;
  addLabel: string;
  noun: string;
  amountLabel: string;
  accounts: SettingsAccount[];
  items: { entry: Entry; detail: string }[];
  save: (id: string | null, v: Payload) => Promise<unknown>;
}

function EntrySection({ id, title, description, addLabel, noun, amountLabel, accounts, items, save }: ListProps) {
  const [editing, setEditing] = useState<Entry | 'new' | null>(null);
  const accountName = (accountId: string) => accounts.find((a) => a.id === accountId)?.name ?? '';

  return (
    <SettingsSection
      id={id}
      title={title}
      description={description}
      action={<Button variant="outline" className="min-h-11 text-[15px]" onClick={() => setEditing('new')}>{addLabel}</Button>}
    >
      {items.length === 0 && <p className="py-3 text-[15px] text-ink-muted">Todavía no hay {title.toLowerCase()}.</p>}
      <ul className="divide-y divide-line">
        {items.map(({ entry, detail }) => (
          <li key={entry.id} className="flex min-h-14 items-center justify-between gap-3 py-1">
            <div className="min-w-0">
              <p className="truncate text-[15px] text-ink">{entry.name} · {accountName(entry.accountId)}</p>
              <p className="text-[13px] leading-[18px] text-ink-muted tabular-nums">{detail}</p>
            </div>
            <Button variant="ghost" className="min-h-11 text-[15px]" aria-label={`Editar ${entry.name}`} onClick={() => setEditing(entry)}>
              Editar
            </Button>
          </li>
        ))}
      </ul>
      <Dialog open={editing !== null} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing === 'new' ? addLabel : `Editar ${noun}`}</DialogTitle>
            <DialogDescription className="sr-only">Datos de la {noun}</DialogDescription>
          </DialogHeader>
          {editing !== null && (
            <EntryForm
              key={editing === 'new' ? 'new' : editing.id}
              entry={editing === 'new' ? null : editing}
              accounts={accounts}
              amountLabel={amountLabel}
              save={(v) => save(editing === 'new' ? null : editing.id, v)}
              onDone={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </SettingsSection>
  );
}

const pocketEntry = (p: SettingsPocket): Entry => ({ id: p.id, name: p.name, accountId: p.accountId, cents: p.monthlyLimitCents });
const fundEntry = (f: SettingsFund): Entry => ({ id: f.id, name: f.name, accountId: f.accountId, cents: f.monthlyAllocationCents });

export function PocketsFundsSection({ settings }: { settings: SettingsView }) {
  const createPocket = useSettingsAction(createPocketAction);
  const updatePocket = useSettingsAction((v: { id: string; name: string; accountId: string; monthlyLimitCents: number }) =>
    updatePocketAction(v.id, { name: v.name, accountId: v.accountId, monthlyLimitCents: v.monthlyLimitCents }));
  const createFund = useSettingsAction(createFundAction);
  const updateFund = useSettingsAction((v: { id: string; name: string; accountId: string; monthlyAllocationCents: number }) =>
    updateFundAction(v.id, { name: v.name, accountId: v.accountId, monthlyAllocationCents: v.monthlyAllocationCents }));

  return (
    <>
      <EntrySection
        id="ajustes-bolsas"
        title="Bolsas"
        description="El límite nuevo vale ya para este mes."
        addLabel="Añadir bolsa"
        noun="bolsa"
        amountLabel="Límite al mes (€)"
        accounts={settings.accounts}
        items={settings.pockets.map((p) => ({ entry: pocketEntry(p), detail: `límite ${formatEuros(p.monthlyLimitCents)}` }))}
        save={(id, v) => id === null
          ? createPocket.mutateAsync({ name: v.name, accountId: v.accountId, monthlyLimitCents: v.cents })
          : updatePocket.mutateAsync({ id, name: v.name, accountId: v.accountId, monthlyLimitCents: v.cents })}
      />
      <EntrySection
        id="ajustes-huchas"
        title="Huchas"
        description="La aportación nueva vale desde el mes que viene."
        addLabel="Añadir hucha"
        noun="hucha"
        amountLabel="Aportación al mes (€)"
        accounts={settings.accounts}
        items={settings.funds.map((f) => ({
          entry: fundEntry(f),
          detail: `Aportas ${formatEuros(f.monthlyAllocationCents)} al mes · tienes ${formatEuros(f.balanceCents)}`,
        }))}
        save={(id, v) => id === null
          ? createFund.mutateAsync({ name: v.name, accountId: v.accountId, monthlyAllocationCents: v.cents })
          : updateFund.mutateAsync({ id, name: v.name, accountId: v.accountId, monthlyAllocationCents: v.cents })}
      />
    </>
  );
}
