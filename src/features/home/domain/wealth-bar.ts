import type { AccountBalance } from '@/features/wealth/domain/types';

// Clases literales para que Tailwind las detecte.
const SERIES = ['bg-serie-1', 'bg-serie-2', 'bg-serie-3', 'bg-serie-4', 'bg-serie-5'] as const;

export interface WealthSegment { accountId: string; pct: number; color: string }
export interface WealthLegendItem { accountId: string; name: string; cents: number; color: string | null }

export function wealthBar(accounts: AccountBalance[]): { segments: WealthSegment[]; legend: WealthLegendItem[] } {
  const positive = accounts.filter((a) => a.estimatedCents !== null && a.estimatedCents > 0);
  const sum = positive.reduce((s, a) => s + a.estimatedCents!, 0);

  const pcts = positive.map((a) => Math.floor((a.estimatedCents! * 100) / sum));
  let rest = positive.length > 0 ? 100 - pcts.reduce((s, p) => s + p, 0) : 0;
  const byLargest = positive.map((_, i) => i).sort((i, j) => positive[j].estimatedCents! - positive[i].estimatedCents! || i - j);
  for (let k = 0; rest > 0; k = (k + 1) % byLargest.length, rest--) pcts[byLargest[k]] += 1;

  const colorOf = new Map<string, string>();
  const segments = positive.map((a, i) => {
    const color = SERIES[i % SERIES.length];
    colorOf.set(a.accountId, color);
    return { accountId: a.accountId, pct: pcts[i], color };
  });

  const legend = accounts
    .filter((a) => a.estimatedCents !== null)
    .map((a) => ({
      accountId: a.accountId,
      name: a.name,
      cents: a.estimatedCents!,
      color: colorOf.get(a.accountId) ?? null,
    }));
  return { segments, legend };
}
