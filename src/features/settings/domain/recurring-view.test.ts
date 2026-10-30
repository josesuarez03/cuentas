import { describe, expect, it } from 'vitest';
import { filterRecurringByName, recurringNote, sortRecurringByName } from './recurring-view';
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

describe('sortRecurringByName', () => {
  const named = (id: string, name: string, kind: SettingsRecurring['kind'] = 'expense') => ({ ...base, id, name, kind });

  it('orden alfabético en español sin distinguir acentos ni mayúsculas', () => {
    const items = [named('1', 'Luz'), named('2', 'agua'), named('3', 'Ágata'), named('4', 'Gimnasio'), named('5', 'Alquiler')];
    expect(sortRecurringByName(items).map((r) => r.name)).toEqual(['Ágata', 'agua', 'Alquiler', 'Gimnasio', 'Luz']);
  });

  it('mezcla ingresos y gastos (la lista no tiene grupos) y no cambia el array original', () => {
    const items = [named('1', 'Nómina', 'income'), named('2', 'Internet')];
    expect(sortRecurringByName(items).map((r) => r.name)).toEqual(['Internet', 'Nómina']);
    expect(items.map((r) => r.name)).toEqual(['Nómina', 'Internet']);
  });

  it('la ñ va después de la n', () => {
    expect(sortRecurringByName([named('1', 'Ñu'), named('2', 'Nube'), named('3', 'Oro')]).map((r) => r.name)).toEqual(['Nube', 'Ñu', 'Oro']);
  });
});

describe('filterRecurringByName', () => {
  const items = [{ ...base, id: '1', name: 'Agua' }, { ...base, id: '2', name: 'Ágata' }, { ...base, id: '3', name: 'Nómina' }];

  it('sin texto (o solo espacios) devuelve todo', () => {
    expect(filterRecurringByName(items, '')).toEqual(items);
    expect(filterRecurringByName(items, '   ')).toEqual(items);
  });

  it('ignora acentos y mayúsculas, en ambos sentidos', () => {
    expect(filterRecurringByName(items, 'NOMINA').map((r) => r.name)).toEqual(['Nómina']);
    expect(filterRecurringByName(items, 'ága').map((r) => r.name)).toEqual(['Ágata']);
    expect(filterRecurringByName(items, 'ag').map((r) => r.name)).toEqual(['Agua', 'Ágata']);
    expect(filterRecurringByName(items, ' mina ').map((r) => r.name)).toEqual(['Nómina']);
  });

  it('sin coincidencias devuelve una lista vacía', () => {
    expect(filterRecurringByName(items, 'luz')).toEqual([]);
  });
});
