'use client';

import { SelectField, TextField } from '@/features/month/components/form-fields';
import { parseEuros } from '@/lib/money';
import type { WizardForm } from './onboarding-wizard';

export function SalaryStep({ form }: { form: WizardForm }) {
  return (
    <div className="flex flex-col gap-5">
      <form.Field
        name="salary.amount"
        validators={{ onChange: ({ value }) => ((parseEuros(value) ?? 0) > 0 ? undefined : 'Escribe un importe, por ejemplo 1.870.') }}
      >
        {(field) => <TextField field={field} inputMode="decimal" label="Neto al mes (€)" />}
      </form.Field>
      <form.Field
        name="salary.paydayDay"
        validators={{
          onChange: ({ value }) => {
            const day = Number(value);
            return Number.isInteger(day) && day >= 1 && day <= 31 ? undefined : 'Escribe un día entre 1 y 31.';
          },
        }}
      >
        {(field) => <TextField field={field} inputMode="numeric" label="Día de cobro" />}
      </form.Field>
      <form.Subscribe selector={(state) => state.values.accounts.map((a) => a.name)}>
        {(names) => (
          <form.Field name="salary.accountIndex">
            {(field) => (
              <SelectField
                field={field}
                label="Cuenta"
                options={names.map((name, i) => ({ value: String(i), label: name || `Cuenta ${i + 1}` }))}
                emptyText="Sin cuentas"
              />
            )}
          </form.Field>
        )}
      </form.Subscribe>
    </div>
  );
}
