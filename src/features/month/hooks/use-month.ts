'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { updateEntryAmountAction } from '@/features/month/server/actions';
import { withEntryAmount, type MonthView } from '@/features/month/domain/month-view';
import type { Upcoming } from '@/features/month/domain/upcoming';
import type { Catalog } from '@/features/catalog/server/catalog';
import { SAVE_ERROR } from '@/features/month/save-error';

export type MonthResponse = { view: MonthView; catalog: Catalog; upcoming: Upcoming | null };

export class MonthFetchError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const monthKey = (ym: string) => ['month', ym] as const;

async function fetchMonth(ym: string): Promise<MonthResponse> {
  let res: Response;
  try {
    res = await fetch(`/api/months/${ym}`);
    if (res.ok) return (await res.json()) as MonthResponse;
  } catch {
    throw new MonthFetchError(503, 'No se ha podido cargar el mes. Revisa la conexión.');
  }
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  throw new MonthFetchError(res.status, body.error ?? 'No se ha podido cargar el mes.');
}

export function useMonth(ym: string) {
  return useQuery({
    queryKey: monthKey(ym),
    queryFn: () => fetchMonth(ym),
    retry: (count, error) => !(error instanceof MonthFetchError && error.status < 500) && count < 2,
  });
}

/** Error con texto ya pensado para el usuario (viene del `ActionResult`). */
class SaveError extends Error {}

export function useUpdateAmount(ym: string) {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: async ({ entryId, amountCents }: { entryId: string; amountCents: number }) => {
      let result;
      try {
        result = await updateEntryAmountAction(entryId, amountCents);
      } catch {
        throw new SaveError(SAVE_ERROR);
      }
      if (!result.ok) throw new SaveError(result.error);
    },
    onMutate: async ({ entryId, amountCents }) => {
      await qc.cancelQueries({ queryKey: monthKey(ym) });
      const previous = qc.getQueryData<MonthResponse>(monthKey(ym));
      if (previous) {
        qc.setQueryData<MonthResponse>(monthKey(ym), { ...previous, view: withEntryAmount(previous.view, entryId, amountCents) });
      }
      return { previous };
    },
    onError: (error, vars, context) => {
      if (context?.previous) qc.setQueryData(monthKey(ym), context.previous);
      toast.error(error instanceof SaveError ? error.message : SAVE_ERROR, {
        action: { label: 'Reintentar', onClick: () => mutation.mutate(vars) },
      });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: monthKey(ym) }),
  });
  return mutation;
}
