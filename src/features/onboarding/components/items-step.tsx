'use client';

import { SelectField, TextField } from '@/features/month/components/form-fields';
import { parseEuros } from '@/lib/money';
import type { WizardForm } from './onboarding-wizard';

export function ItemsStep({ form }: { form: WizardForm }) {
  return (
    <div className="flex flex-col gap-5">
      <p className="text-[15px] text-ink-muted">
        Lo que pagas cada mes. Deja en blanco lo que no tengas; el resto lo añades en Ajustes.
      </p>
      <form.Subscribe selector={(state) => state.values.accounts.map((a) => a.name)}>
        {(names) => (
          <form.Field name="items" mode="array">
            {(items) =>
              items.state.value.map((item, i) => (
                <div key={item.name} className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4">
                  <form.Field
                    name={`items[${i}].amount`}
                    validators={{ onChange: ({ value }) => (value.trim() === '' || parseEuros(value) !== null ? undefined : 'Escribe un importe, por ejemplo 480.') }}
                  >
                    {(field) => <TextField field={field} inputMode="decimal" label={`${item.name} (€)`} />}
                  </form.Field>
                  {names.length > 1 && (
                    <form.Field name={`items[${i}].accountIndex`}>
                      {(field) => (
                        <SelectField
                          field={field}
                          label={`Cuenta de ${item.name.toLowerCase()}`}
                          options={names.map((name, n) => ({ value: String(n), label: name || `Cuenta ${n + 1}` }))}
                          emptyText="Sin cuentas"
                        />
                      )}
                    </form.Field>
                  )}
                </div>
              ))
            }
          </form.Field>
        )}
      </form.Subscribe>
    </div>
  );
}
