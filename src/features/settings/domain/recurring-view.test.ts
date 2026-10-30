import { describe, expect, it } from 'vitest';
import { recurringNote } from './recurring-view';
import type { SettingsRecurring } from './types';

const base: SettingsRecurring = {
  id: 'r1', name: 'Luz', kind: 'expense', categoryId: 'c1', categoryLabel: 'Piso › Luz',
  accountId: 'a1', accountName: 'BBVA principal', amountCents: 6000, frequency: 'monthly', startMonth: '2026-01',
  anchorMonth: null, installmentsTotal: null, paydayDay: null, paydayRule: 'before', active: true,
  currentInstallment: null, remainingInstallments: null,
};

describe('recurringNote', () => {
  it('nota por frecuencia', () => {
    expect(recurringNote({ ...base, frequency: 'monthly' })).toBe('Mensual · BBVA principal');
    expect(recurringNote({ ...base, kind: 'income', paydayDay: 27 })).toBe('Mensual · cobro el día 27 o el hábil anterior · BBVA principal');
    expect(recurringNote({ ...base, kind: 'income', paydayDay: 27, paydayRule: 'after' })).toBe('Mensual · cobro el día 27 o el hábil siguiente · BBVA principal');
    expect(recurringNote({ ...base, frequency: 'bimonthly' })).toBe('Cada 2 meses · BBVA principal');
    expect(recurringNote({ ...base, frequency: 'annual', anchorMonth: 3 })).toBe('Anual, en marzo · BBVA principal');
    expect(recurringNote({ ...base, frequency: 'installments', installmentsTotal: 6, currentInstallment: 3, remainingInstallments: 3 })).toBe('Cuota 3 de 6 · quedan 3 · BBVA principal');
    expect(recurringNote({ ...base, frequency: 'installments', installmentsTotal: 6, currentInstallment: null, remainingInstallments: 0 })).toBe('A plazos · terminada · BBVA principal');
  });

  it('cuotas que aún no han empezado', () => {
    expect(recurringNote({ ...base, frequency: 'installments', startMonth: '2026-12', installmentsTotal: 6, currentInstallment: null, remainingInstallments: 6 })).toBe('A plazos · empieza en diciembre · BBVA principal');
  });
});
