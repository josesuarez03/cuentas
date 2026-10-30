import type { AccountType } from '@/features/wealth/domain/types';

export type Frequency = 'monthly' | 'bimonthly' | 'annual' | 'installments';
export interface SettingsAccount { id: string; name: string; bank: string; type: AccountType; defaultSavingsPercent: number }
export interface SettingsCategory { id: string; name: string; kind: 'income' | 'expense'; parentId: string | null }
export interface SettingsRecurring {
  id: string; name: string; kind: 'income' | 'expense';
  categoryId: string; categoryLabel: string;   // «Piso › Luz» si es subcategoría
  accountId: string; accountName: string;
  amountCents: number; frequency: Frequency; startMonth: string;
  anchorMonth: number | null; installmentsTotal: number | null; paydayDay: number | null; active: boolean;
  currentInstallment: number | null;           // cuota de este mes, si toca
  remainingInstallments: number | null;        // cuotas que faltan después de este mes
}
export interface SettingsPocket { id: string; name: string; accountId: string; monthlyLimitCents: number }
export interface SettingsFund { id: string; name: string; accountId: string; monthlyAllocationCents: number; balanceCents: number }
export interface Preferences { emailNotifications: boolean; pushNotifications: boolean }
export interface SettingsView {
  accounts: SettingsAccount[]; categories: SettingsCategory[]; recurring: SettingsRecurring[];
  pockets: SettingsPocket[]; funds: SettingsFund[]; preferences: Preferences;
}
export const settingsKey = ['settings'] as const;
export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  checking: 'Cuenta corriente', savings: 'Ahorro', joint: 'Conjunta', credit_card: 'Tarjeta de crédito', investment: 'Inversión',
};
/** Cuentas que pueden recibir ahorro (mismo filtro que SplitDialog). */
export const SAVINGS_TARGET = (t: AccountType) => t !== 'credit_card' && t !== 'joint';
