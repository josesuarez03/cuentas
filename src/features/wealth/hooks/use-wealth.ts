'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { runAction, SaveError } from '@/features/month/hooks/use-month';
import { SAVE_ERROR } from '@/features/month/save-error';
import { withSnapshot } from '@/features/wealth/domain/optimistic';
import { wealthKey, type WealthView } from '@/features/wealth/domain/types';
import { addBalanceSnapshotAction } from '@/features/wealth/server/actions';

export class WealthFetchError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function fetchWealth(): Promise<WealthView> {
  let res: Response;
  try {
    res = await fetch('/api/wealth');
    if (res.ok) return (await res.json()) as WealthView;
  } catch {
    throw new WealthFetchError(503, 'No se ha podido cargar el patrimonio. Revisa la conexión.');
  }
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  throw new WealthFetchError(res.status, body.error ?? 'No se ha podido cargar el patrimonio.');
}

export function useWealth() {
  return useQuery({
    queryKey: wealthKey,
    queryFn: fetchWealth,
    retry: (count, error) => !(error instanceof WealthFetchError && error.status < 500) && count < 2,
  });
}

export function useAddSnapshot() {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: (v: { accountId: string; balanceCents: number }) =>
      runAction(() => addBalanceSnapshotAction(v.accountId, v.balanceCents)),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: wealthKey });
      const previous = qc.getQueryData<WealthView>(wealthKey);
      if (previous) qc.setQueryData<WealthView>(wealthKey, withSnapshot(previous, v.accountId, v.balanceCents, new Date()));
      return { previous };
    },
    onError: (error, v, context) => {
      if (context?.previous) qc.setQueryData(wealthKey, context.previous);
      toast.error(error instanceof SaveError ? error.message : SAVE_ERROR, {
        action: { label: 'Reintentar', onClick: () => mutation.mutate(v) },
      });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: wealthKey }),
  });
  return mutation;
}
