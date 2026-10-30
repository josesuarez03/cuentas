export type EntryKind = 'income' | 'expense' | 'loan_out' | 'loan_repayment';

export interface CalcInput {
  status: 'open' | 'closed';
  entries: { kind: EntryKind; amountCents: number }[];
  fundAllocationsCents: number;
  pockets: { limitCents: number; spentCents: number }[];
  split: { accountId: string; percent: number }[];
}

export interface MonthCalc {
  incomeCents: number;
  expenseCents: number;
  fundsCents: number;
  pocketsCents: number;
  availableCents: number;
  savings: { accountId: string; cents: number }[];
}

export function splitSavings(
  availableCents: number,
  split: { accountId: string; percent: number }[],
): { accountId: string; cents: number }[] {
  if (availableCents <= 0) return split.map((s) => ({ accountId: s.accountId, cents: 0 }));
  const parts = split.map((s) => ({ ...s, cents: Math.floor((availableCents * s.percent) / 100) }));
  let rest = availableCents - parts.reduce((a, p) => a + p.cents, 0);
  const byPercent = [...parts].sort((a, b) => b.percent - a.percent);
  for (let i = 0; rest > 0 && byPercent.length > 0; i = (i + 1) % byPercent.length) {
    byPercent[i].cents += 1;
    rest -= 1;
  }
  return parts.map(({ accountId, cents }) => ({ accountId, cents }));
}

export function computeMonth(input: CalcInput): MonthCalc {
  let incomeCents = 0;
  let expenseCents = 0;
  for (const e of input.entries) {
    if (e.kind === 'income' || e.kind === 'loan_repayment') incomeCents += e.amountCents;
    else expenseCents += e.amountCents;
  }
  const pocketsCents = input.pockets.reduce(
    (acc, p) => acc + (input.status === 'open' ? Math.max(p.limitCents, p.spentCents) : p.spentCents),
    0,
  );
  const availableCents = incomeCents - expenseCents - input.fundAllocationsCents - pocketsCents;
  return {
    incomeCents,
    expenseCents,
    fundsCents: input.fundAllocationsCents,
    pocketsCents,
    availableCents,
    savings: splitSavings(availableCents, input.split),
  };
}
