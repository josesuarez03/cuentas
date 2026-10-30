'use client';

import { recomputeView } from '@/features/month/domain/month-view';
import { closeMonthAction, reopenMonthAction } from '@/features/month/server/lifecycle-actions';
import { useMonthMutation } from './use-month';

export function useSetMonthStatus(ym: string) {
  return useMonthMutation(
    ym,
    (status: 'open' | 'closed') => (status === 'open' ? reopenMonthAction(ym) : closeMonthAction(ym)),
    (view, status) => recomputeView({ ...view, status }),
  );
}
