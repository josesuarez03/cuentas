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
        ? `${FREQUENCY_LABEL.monthly} · cobro el día ${r.paydayDay}`
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
