'use server';

import { z } from 'zod';
import { db } from '@/db';
import { isYearMonth } from '@/lib/year-month';
import { requireUser } from '@/features/auth/session';
import { addPocketExpense, spendFromFund, type NewFundSpend, type NewPocketExpense } from './pockets';
import { optionalNote, positiveCents } from '@/features/month/domain/amount-schema';
import { toResult, type ActionResult } from './action-result';

const yearMonth = z.string().refine(isYearMonth);
const pocketSchema = z.object({ yearMonth, pocketId: z.uuid(), amountCents: positiveCents, note: optionalNote });
const fundSchema = z.object({ yearMonth, fundId: z.uuid(), amountCents: positiveCents, note: optionalNote });

export async function addPocketExpenseAction(input: NewPocketExpense): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = pocketSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Revisa el gasto.' };
  try {
    await addPocketExpense(db, user.id, parsed.data);
    return { ok: true };
  } catch (error) {
    return toResult(error);
  }
}

export async function spendFromFundAction(input: NewFundSpend): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = fundSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Revisa el gasto.' };
  try {
    await spendFromFund(db, user.id, parsed.data);
    return { ok: true };
  } catch (error) {
    return toResult(error);
  }
}
