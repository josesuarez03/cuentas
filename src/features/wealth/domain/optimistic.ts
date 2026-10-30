import type { WealthView } from './types';

/** Aplica un saldo nuevo a la vista: pasa a ser real y estimado a la vez, y el total se mueve la diferencia. */
export function withSnapshot(view: WealthView, accountId: string, balanceCents: number, now: Date): WealthView {
  const current = view.accounts.find((a) => a.accountId === accountId);
  if (!current) return view;
  const delta = balanceCents - (current.estimatedCents ?? 0);
  return {
    ...view,
    accounts: view.accounts.map((a) =>
      a.accountId === accountId
        ? { ...a, realCents: balanceCents, estimatedCents: balanceCents, diffCents: 0, stale: false, realDate: now.toISOString() }
        : a,
    ),
    totalCents: view.totalCents + delta,
    variationCents: view.variationCents === null ? null : view.variationCents + delta,
  };
}
