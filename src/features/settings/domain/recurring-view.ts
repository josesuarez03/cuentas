import { formatMonthNameOnly } from '@/lib/year-month';
import type { Frequency, SettingsRecurring } from './types';

export const FREQUENCY_LABEL: Record<Frequency, string> = {
  monthly: 'Mensual',
  bimonthly: 'Cada 2 meses',
  annual: 'Anual',
  installments: 'A plazos',
};

/** Frecuencia con sus detalles, sin la cuenta (columna «Frecuencia»). */
export function recurringFrequencyNote(r: SettingsRecurring): string {
  switch (r.frequency) {
    case 'monthly':
      return r.kind === 'income' && r.paydayDay !== null
        ? `${FREQUENCY_LABEL.monthly} · cobro el día ${r.paydayDay} o el hábil ${r.paydayRule === 'after' ? 'siguiente' : 'anterior'}`
        : FREQUENCY_LABEL.monthly;
    case 'bimonthly':
      return FREQUENCY_LABEL.bimonthly;
    case 'annual':
      return r.anchorMonth === null
        ? FREQUENCY_LABEL.annual
        : `${FREQUENCY_LABEL.annual}, en ${formatMonthNameOnly(`2000-${String(r.anchorMonth).padStart(2, '0')}`)}`;
    case 'installments': {
      if (r.currentInstallment !== null) {
        return `Cuota ${r.currentInstallment} de ${r.installmentsTotal} · quedan ${r.remainingInstallments ?? 0}`;
      }
      if (r.remainingInstallments === 0) return `${FREQUENCY_LABEL.installments} · terminada`;
      if (r.remainingInstallments !== null && r.remainingInstallments === r.installmentsTotal) {
        return `${FREQUENCY_LABEL.installments} · empieza en ${formatMonthNameOnly(r.startMonth)}`;
      }
      return FREQUENCY_LABEL.installments;
    }
  }
}

export function recurringNote(r: SettingsRecurring): string {
  return `${recurringFrequencyNote(r)} · ${r.accountName}`;
}

/** Por nombre, en español y sin distinguir acentos ni mayúsculas («Ágata» junto a «Agua»). */
export function sortRecurringByName(items: readonly SettingsRecurring[]): SettingsRecurring[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }) || a.id.localeCompare(b.id));
}

function searchable(text: string): string {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('es').trim();
}

/** Partidas cuyo nombre contiene el texto, sin distinguir acentos ni mayúsculas. */
export function filterRecurringByName(items: readonly SettingsRecurring[], query: string): SettingsRecurring[] {
  const q = searchable(query);
  if (q === '') return [...items];
  return items.filter((r) => searchable(r.name).includes(q));
}
