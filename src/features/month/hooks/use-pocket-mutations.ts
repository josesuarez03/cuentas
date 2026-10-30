'use client';

import { addPocketExpenseAction, spendFromFundAction } from '@/features/month/server/pocket-actions';
import type { NewFundSpend, NewPocketExpense } from '@/features/month/server/pockets';
import { withFundSpend, withPocketExpense } from '@/features/month/domain/month-view';
import { wealthKey } from '@/features/wealth/domain/types';
import { useMonthMutation } from './use-month';

export function useAddPocketExpense(ym: string) {
  return useMonthMutation(
    ym,
    (v: Omit<NewPocketExpense, 'yearMonth'>) => addPocketExpenseAction({ ...v, yearMonth: ym }),
    (view, v) => withPocketExpense(view, v.pocketId, v.amountCents),
    { alsoInvalidate: [wealthKey] },
  );
}

export function useSpendFromFund(ym: string) {
  return useMonthMutation(
    ym,
    (v: Omit<NewFundSpend, 'yearMonth'>) => spendFromFundAction({ ...v, yearMonth: ym }),
    (view, v) => withFundSpend(view, v.fundId, v.amountCents),
    { alsoInvalidate: [wealthKey] },
  );
}
