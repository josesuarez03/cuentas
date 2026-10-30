export type AccountType = 'checking' | 'savings' | 'joint' | 'credit_card' | 'investment';

export interface AccountBalance {
  accountId: string;
  name: string;
  type: AccountType;
  realCents: number | null;      // último snapshot (con signo; tarjeta negativa)
  realDate: string | null;       // ISO del snapshot
  estimatedCents: number | null; // null si no hay snapshot
  diffCents: number | null;      // estimado − real
  stale: boolean;                // snapshot con más de 30 días
}

export interface PendingLoan { id: string; person: string; amountCents: number; lentYearMonth: string; note: string | null }
export interface WealthPoint { yearMonth: string; totalCents: number }

export interface WealthView {
  accounts: AccountBalance[];
  totalCents: number;
  variationCents: number | null;
  previousYearMonth: string;     // para «… desde septiembre»
  loans: PendingLoan[];
  history: WealthPoint[];        // de más antiguo a más reciente
}

export const wealthKey = ['wealth'] as const;
