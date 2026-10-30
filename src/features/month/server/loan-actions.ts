'use server';

import { z } from 'zod';
import { db } from '@/db';
import { isYearMonth } from '@/lib/year-month';
import { requireUser } from '@/features/auth/session';
import { optionalNote, positiveCents } from '@/features/month/domain/amount-schema';
import { toResult, type ActionResult } from './action-result';
import { lendMoney, markLoanRepaid, type NewLoan } from './loans';

const loanSchema = z.object({
  yearMonth: z.string().refine(isYearMonth),
  person: z.string().trim().min(1).max(40),
  amountCents: positiveCents,
  accountId: z.uuid(),
  note: optionalNote,
});

export async function lendMoneyAction(input: NewLoan): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = loanSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Revisa los datos del préstamo.' };
  try {
    await lendMoney(db, user.id, parsed.data);
    return { ok: true };
  } catch (error) {
    return toResult(error);
  }
}

export async function markLoanRepaidAction(loanId: string): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = z.uuid().safeParse(loanId);
  if (!parsed.success) return { ok: false, error: 'Préstamo no válido.' };
  try {
    await markLoanRepaid(db, user.id, parsed.data);
    return { ok: true };
  } catch (error) {
    return toResult(error);
  }
}
