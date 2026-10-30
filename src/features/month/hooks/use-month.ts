'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { confirmIncomeAction, updateEntryAmountAction } from '@/features/month/server/actions';
import type { ActionResult } from '@/features/month/server/action-result';
import { withEntryAmount, withIncomeConfirmed, type MonthView } from '@/features/month/domain/month-view';
import type { Upcoming } from '@/features/month/domain/upcoming';
import type { Catalog } from '@/features/catalog/server/catalog';
import { SAVE_ERROR } from '@/features/month/save-error';

export type MonthResponse = { view: MonthView; catalog: Catalog; upcoming: Upcoming | null; upcomingLater: Upcoming | null };

export class MonthFetchError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const monthKey = (ym: string) => ['month', ym] as const;

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
export class SaveError extends Error {}

export async function runAction(action: () => Promise<ActionResult>): Promise<void> {
  let result: ActionResult;
  try {
    result = await action();
  } catch {
    throw new SaveError(SAVE_ERROR);
  }
  if (!result.ok) throw new SaveError(result.error);
}

export function useMonthMutation<V>(
  ym: string,
  action: (vars: V) => Promise<ActionResult>,
  apply: (view: MonthView, vars: V) => MonthView,
  options: { alsoInvalidate?: readonly (readonly unknown[])[] } = {},
) {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: (vars: V) => runAction(() => action(vars)),
    onMutate: async (vars: V) => {
      await qc.cancelQueries({ queryKey: monthKey(ym) });
      const previous = qc.getQueryData<MonthResponse>(monthKey(ym));
      if (previous) qc.setQueryData<MonthResponse>(monthKey(ym), { ...previous, view: apply(previous.view, vars) });
      return { previous };
    },
    onError: (error, vars, context) => {
      if (context?.previous) qc.setQueryData(monthKey(ym), context.previous);
      toast.error(error instanceof SaveError ? error.message : SAVE_ERROR, {
        action: { label: 'Reintentar', onClick: () => mutation.mutate(vars) },
      });
    },
    onSettled: () => Promise.all([
      qc.invalidateQueries({ queryKey: monthKey(ym) }),
      ...(options.alsoInvalidate ?? []).map((queryKey) => qc.invalidateQueries({ queryKey })),
    ]),
  });
  return mutation;
}

export function useUpdateAmount(ym: string) {
  return useMonthMutation(
    ym,
    ({ entryId, amountCents }: { entryId: string; amountCents: number }) => updateEntryAmountAction(entryId, amountCents),
    (view, { entryId, amountCents }) => withEntryAmount(view, entryId, amountCents),
  );
}

export function useConfirmIncome(ym: string) {
  return useMonthMutation(ym, (entryId: string) => confirmIncomeAction(entryId), withIncomeConfirmed);
}
