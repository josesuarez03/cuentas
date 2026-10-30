'use server';

import { z } from 'zod';
import { db } from '@/db';
import { isYearMonth } from '@/lib/year-month';
import {
  addOneOffEntry, ClosedMonthError, NotFoundError, setSavingsSplit, updateEntryAmount, type NewOneOffEntry,
} from '@/features/month/server/entries';
import { requireUser } from '@/features/auth/session';
import { SAVE_ERROR } from '@/features/month/save-error';

export type ActionResult = { ok: true } | { ok: false; error: string };

function toResult(error: unknown): ActionResult {
  if (error instanceof NotFoundError || error instanceof ClosedMonthError || error instanceof RangeError) {
    return { ok: false, error: error.message };
  }
  console.error(error);
  return { ok: false, error: SAVE_ERROR };
}

const cents = z.number().int().min(0).max(100_000_000);

export async function updateEntryAmountAction(entryId: string, amountCents: number): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = z.object({ entryId: z.uuid(), amountCents: cents }).safeParse({ entryId, amountCents });
  if (!parsed.success) return { ok: false, error: 'Importe no válido.' };
  try {
    await updateEntryAmount(db, user.id, parsed.data.entryId, parsed.data.amountCents);
    return { ok: true };
  } catch (error) {
    return toResult(error);
  }
}

const newEntrySchema = z.object({
  yearMonth: z.string().refine(isYearMonth),
  kind: z.enum(['income', 'expense']),
  name: z.string().trim().min(1).max(80),
  categoryId: z.uuid(),
  accountId: z.uuid(),
  amountCents: cents,
});

export async function addOneOffEntryAction(input: NewOneOffEntry): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = newEntrySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Revisa los datos de la partida.' };
  try {
    await addOneOffEntry(db, user.id, parsed.data);
    return { ok: true };
  } catch (error) {
    return toResult(error);
  }
}

const splitSchema = z.array(z.object({ accountId: z.uuid(), percent: z.number().int().min(0).max(100) })).min(1);

export async function setSavingsSplitAction(
  ym: string,
  split: { accountId: string; percent: number }[],
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = splitSchema.safeParse(split);
  if (!isYearMonth(ym) || !parsed.success) return { ok: false, error: 'Reparto no válido.' };
  try {
    await setSavingsSplit(db, user.id, ym, parsed.data);
    return { ok: true };
  } catch (error) {
    return toResult(error);
  }
}
