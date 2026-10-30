'use server';

import { db } from '@/db';
import { isYearMonth } from '@/lib/year-month';
import { requireUser } from '@/features/auth/session';
import { closeMonth, reopenMonth } from './lifecycle';
import { toResult, type ActionResult } from './action-result';

export async function reopenMonthAction(ym: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!isYearMonth(ym)) return { ok: false, error: 'Mes no válido.' };
  try {
    await reopenMonth(db, user.id, ym);
    return { ok: true };
  } catch (error) {
    return toResult(error);
  }
}

export async function closeMonthAction(ym: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!isYearMonth(ym)) return { ok: false, error: 'Mes no válido.' };
  try {
    await closeMonth(db, user.id, ym);
    return { ok: true };
  } catch (error) {
    return toResult(error);
  }
}
