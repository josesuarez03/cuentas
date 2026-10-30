'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { updateEntryAmountAction } from '@/features/month/server/actions';
import { withEntryAmount, type MonthView } from '@/features/month/domain/month-view';
import type { Catalog } from '@/features/catalog/server/catalog';

export type MonthResponse = { view: MonthView; catalog: Catalog };

export class MonthFetchError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const monthKey = (ym: string) => ['month', ym] as const;

async function fetchMonth(ym: string): Promise<MonthResponse> {
  const res = await fetch(`/api/months/${ym}`);
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new MonthFetchError(res.status, body.error ?? 'No se ha podido cargar el mes.');
  }
  return res.json() as Promise<MonthResponse>;
}

export function useMonth(ym: string) {
  return useQuery({
    queryKey: monthKey(ym),
    queryFn: () => fetchMonth(ym),
    retry: (count, error) => !(error instanceof MonthFetchError && error.status < 500) && count < 2,
  });
}

export function useUpdateAmount(ym: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ entryId, amountCents }: { entryId: string; amountCents: number }) => {
      const result = await updateEntryAmountAction(entryId, amountCents);
      if (!result.ok) throw new Error(result.error);
    },
    onMutate: async ({ entryId, amountCents }) => {
      await qc.cancelQueries({ queryKey: monthKey(ym) });
      const previous = qc.getQueryData<MonthResponse>(monthKey(ym));
      if (previous) {
        qc.setQueryData<MonthResponse>(monthKey(ym), { ...previous, view: withEntryAmount(previous.view, entryId, amountCents) });
      }
      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) qc.setQueryData(monthKey(ym), context.previous);
      toast.error(error.message);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: monthKey(ym) }),
  });
}
