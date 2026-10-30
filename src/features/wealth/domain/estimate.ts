import type { EntryKind } from '@/features/month/domain/month-calc';
import { addMonths, currentYearMonth, startOfMonth } from '@/lib/year-month';
import type { AccountType, PendingLoan, WealthPoint, WealthView } from './types';

export interface Snapshot { accountId: string; balanceCents: number; date: Date }
export interface Flow { accountId: string; cents: number; at: Date }
export interface AccountRef { id: string; name: string; type: AccountType }

interface BuildInput {
  accounts: AccountRef[];
  snapshots: Snapshot[];
  flows: Flow[];
  loans: PendingLoan[];
  now: Date;
}

export function flowOfEntry(e: {
  accountId: string;
  kind: EntryKind;
  amountCents: number;
  status: 'pending' | 'confirmed' | null;
  createdAt: Date;
  confirmedAt: Date | null;
}): Flow | null {
  switch (e.kind) {
    case 'income':
      return e.status === 'confirmed'
        ? { accountId: e.accountId, cents: e.amountCents, at: e.confirmedAt ?? e.createdAt }
        : null;
    case 'expense':
    case 'loan_out':
      return { accountId: e.accountId, cents: -e.amountCents, at: e.createdAt };
    case 'loan_repayment':
      return { accountId: e.accountId, cents: e.amountCents, at: e.createdAt };
  }
}

export function estimateAt(
  accounts: AccountRef[],
  snapshots: Snapshot[],
  flows: Flow[],
  at: Date,
): { account: AccountRef; snapshot: Snapshot | null; estimatedCents: number | null }[] {
  return accounts.map((account) => {
    let snapshot: Snapshot | null = null;
    for (const sn of snapshots) {
      if (sn.accountId !== account.id || sn.date.getTime() > at.getTime()) continue;
      if (!snapshot || sn.date.getTime() > snapshot.date.getTime()) snapshot = sn;
    }
    if (!snapshot) return { account, snapshot: null, estimatedCents: null };
    const from = snapshot.date.getTime();
    const sum = flows
      .filter((f) => f.accountId === account.id && f.at.getTime() > from && f.at.getTime() <= at.getTime())
      .reduce((acc, f) => acc + f.cents, 0);
    return { account, snapshot, estimatedCents: snapshot.balanceCents + sum };
  });
}

const DAY = 86_400_000;
const total = (rows: { estimatedCents: number | null }[]) => rows.reduce((acc, r) => acc + (r.estimatedCents ?? 0), 0);

export function buildWealth({ accounts, snapshots, flows, loans, now }: BuildInput): WealthView {
  const ym = currentYearMonth(now);
  const current = estimateAt(accounts, snapshots, flows, now);
  const atStart = estimateAt(accounts, snapshots, flows, startOfMonth(ym));
  const comparable = current.some((r) => r.estimatedCents !== null)
    && current.every((r, i) => r.estimatedCents === null || atStart[i].estimatedCents !== null);

  const history: WealthPoint[] = [];
  for (let i = 5; i >= 0; i--) {
    const m = addMonths(ym, -i);
    const rows = estimateAt(accounts, snapshots, flows, i === 0 ? now : startOfMonth(addMonths(m, 1)));
    if (rows.some((r) => r.estimatedCents !== null)) history.push({ yearMonth: m, totalCents: total(rows) });
  }

  return {
    accounts: current.map(({ account, snapshot, estimatedCents }) => ({
      accountId: account.id,
      name: account.name,
      type: account.type,
      realCents: snapshot?.balanceCents ?? null,
      realDate: snapshot?.date.toISOString() ?? null,
      estimatedCents,
      diffCents: snapshot && estimatedCents !== null ? estimatedCents - snapshot.balanceCents : null,
      stale: snapshot ? now.getTime() - snapshot.date.getTime() > 30 * DAY : false,
    })),
    totalCents: total(current),
    variationCents: comparable ? total(current) - total(atStart) : null,
    previousYearMonth: addMonths(ym, -1),
    loans,
    history,
  };
}
