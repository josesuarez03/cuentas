'use client';

import { ACCOUNT_TYPE_LABEL } from '@/features/settings/domain/types';
import { FieldError, SelectField, TextField } from '@/features/month/components/form-fields';
import { parseEuros } from '@/lib/money';
import { Button } from '@/shared/components/ui/button';
import type { WizardForm } from './onboarding-wizard';

export const MAX_ACCOUNTS = 8;
const TYPE_OPTIONS = Object.entries(ACCOUNT_TYPE_LABEL).map(([value, label]) => ({ value, label }));

/** Quita la cuenta i y reasigna los índices guardados (nómina y partidas). */
export function removeAccount(form: WizardForm, i: number) {
  const remap = (value: string) => {
    const n = Number(value);
    if (n === i) return '0';
    return n > i ? String(n - 1) : value;
  };
  void form.removeFieldValue('accounts', i);
  form.setFieldValue('salary.accountIndex', remap(form.state.values.salary.accountIndex));
  form.state.values.items.forEach((item, n) => form.setFieldValue(`items[${n}].accountIndex`, remap(item.accountIndex)));
}

export function AccountsStep({ form }: { form: WizardForm }) {
  return (
    <div className="flex flex-col gap-5">
      <p className="text-[15px] text-ink-muted">
        Apunta tus cuentas y lo que tienes hoy en cada una. El ahorro irá a la primera de ahorro o inversión; podrás cambiarlo en Ajustes.
      </p>
      <form.Field name="accounts" mode="array">
        {(accounts) => (
          <>
            {accounts.state.value.map((account, i) => (
              <fieldset key={i} className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4">
                <legend className="px-1 text-[13px] text-ink-muted">Cuenta {i + 1}</legend>
                <form.Field
                  name={`accounts[${i}].name`}
                  validators={{ onChange: ({ value }) => (value.trim() ? undefined : 'Escribe un nombre, por ejemplo «BBVA».') }}
                >
                  {(field) => <TextField field={field} label="Nombre de la cuenta" />}
                </form.Field>
                <form.Field name={`accounts[${i}].bank`}>
                  {(field) => <TextField field={field} label="Banco" />}
                </form.Field>
                <form.Field name={`accounts[${i}].type`}>
                  {(field) => <SelectField field={field} label="Tipo" options={TYPE_OPTIONS} emptyText="Sin tipos" />}
                </form.Field>
                <form.Subscribe selector={(state) => state.values.accounts[i]?.type}>
                  {(type) => (
                    <form.Field
                      name={`accounts[${i}].balance`}
                      validators={{ onChange: ({ value }) => (value.trim() === '' || parseEuros(value) !== null ? undefined : 'Escribe un importe, por ejemplo 2.300,00.') }}
                    >
                      {(field) => (
                        <TextField
                          field={field}
                          inputMode="decimal"
                          label={type === 'credit_card' ? 'Lo que debes (€)' : 'Saldo de hoy (€)'}
                        />
                      )}
                    </form.Field>
                  )}
                </form.Subscribe>
                {accounts.state.value.length > 1 && (
                  <Button type="button" variant="ghost" className="min-h-11 self-start" onClick={() => removeAccount(form, i)}>
                    Quitar cuenta
                  </Button>
                )}
              </fieldset>
            ))}
            <FieldError field={accounts} />
            {accounts.state.value.length < MAX_ACCOUNTS && (
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                onClick={() => accounts.pushValue({ name: '', bank: '', type: 'checking', balance: '' })}
              >
                Añadir otra cuenta
              </Button>
            )}
          </>
        )}
      </form.Field>
    </div>
  );
}
