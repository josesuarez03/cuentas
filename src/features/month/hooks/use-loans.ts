'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { currentYearMonth } from '@/lib/year-month';
import { markLoanRepaidAction } from '@/features/month/server/loan-actions';
import { monthKey, runAction, SaveError } from '@/features/month/hooks/use-month';
import { SAVE_ERROR } from '@/features/month/save-error';
import { wealthKey, type WealthView } from '@/features/wealth/domain/types';

export function useMarkLoanRepaid() {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: (id: string) => runAction(() => markLoanRepaidAction(id)),
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: wealthKey });
      const previous = qc.getQueryData<WealthView>(wealthKey);
      if (previous) qc.setQueryData<WealthView>(wealthKey, { ...previous, loans: previous.loans.filter((l) => l.id !== id) });
      return { previous };
    },
    onError: (error, id, context) => {
      if (context?.previous) qc.setQueryData(wealthKey, context.previous);
      toast.error(error instanceof SaveError ? error.message : SAVE_ERROR, {
        action: { label: 'Reintentar', onClick: () => mutation.mutate(id) },
      });
    },
    onSettled: () => Promise.all([
      qc.invalidateQueries({ queryKey: wealthKey }),
      qc.invalidateQueries({ queryKey: monthKey(currentYearMonth()) }),
    ]),
  });
  return mutation;
}
