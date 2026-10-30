'use server';

import { z } from 'zod';
import { db } from '@/db';
import { requireUser } from '@/features/auth/session';
import { cents } from '@/features/month/domain/amount-schema';
import { toResult, type ActionResult } from '@/features/month/server/action-result';
import { recurringInputSchema, type RecurringInput } from '../domain/recurring-schema';
import {
  createFund, createPocket, createRecurring, setRecurringActive, updateFund, updatePocket, updateRecurring,
  type FundInput, type PocketInput,
} from './templates';

const pocketSchema = z.object({ name: z.string().trim().min(1).max(40), accountId: z.uuid(), monthlyLimitCents: cents });
const fundSchema = z.object({ name: z.string().trim().min(1).max(40), accountId: z.uuid(), monthlyAllocationCents: cents });

function recurringError(error: z.ZodError): string {
  const issue = error.issues.find((i) => i.code === 'custom');
  return issue ? issue.message : 'Revisa los datos de la partida.';
}

export async function createRecurringAction(input: RecurringInput): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = recurringInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: recurringError(parsed.error) };
  try {
    await createRecurring(db, user.id, parsed.data);
    return { ok: true };
  } catch (error) {
    return toResult(error);
  }
}

export async function updateRecurringAction(id: string, input: RecurringInput): Promise<ActionResult> {
  const user = await requireUser();
  const parsedId = z.uuid().safeParse(id);
  const parsed = recurringInputSchema.safeParse(input);
  if (!parsedId.success) return { ok: false, error: 'Revisa los datos de la partida.' };
  if (!parsed.success) return { ok: false, error: recurringError(parsed.error) };
  try {
    await updateRecurring(db, user.id, parsedId.data, parsed.data);
    return { ok: true };
  } catch (error) {
    return toResult(error);
  }
}

export async function setRecurringActiveAction(id: string, active: boolean): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = z.object({ id: z.uuid(), active: z.boolean() }).safeParse({ id, active });
  if (!parsed.success) return { ok: false, error: 'Revisa los datos de la partida.' };
  try {
    await setRecurringActive(db, user.id, parsed.data.id, parsed.data.active);
    return { ok: true };
  } catch (error) {
    return toResult(error);
  }
}

export async function createPocketAction(input: PocketInput): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = pocketSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Revisa los datos de la bolsa.' };
  try {
    await createPocket(db, user.id, parsed.data);
    return { ok: true };
  } catch (error) {
    return toResult(error);
  }
}

export async function updatePocketAction(id: string, input: PocketInput): Promise<ActionResult> {
  const user = await requireUser();
  const parsedId = z.uuid().safeParse(id);
  const parsed = pocketSchema.safeParse(input);
  if (!parsedId.success || !parsed.success) return { ok: false, error: 'Revisa los datos de la bolsa.' };
  try {
    await updatePocket(db, user.id, parsedId.data, parsed.data);
    return { ok: true };
  } catch (error) {
    return toResult(error);
  }
}

export async function createFundAction(input: FundInput): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = fundSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Revisa los datos de la hucha.' };
  try {
    await createFund(db, user.id, parsed.data);
    return { ok: true };
  } catch (error) {
    return toResult(error);
  }
}

export async function updateFundAction(id: string, input: FundInput): Promise<ActionResult> {
  const user = await requireUser();
  const parsedId = z.uuid().safeParse(id);
  const parsed = fundSchema.safeParse(input);
  if (!parsedId.success || !parsed.success) return { ok: false, error: 'Revisa los datos de la hucha.' };
  try {
    await updateFund(db, user.id, parsedId.data, parsed.data);
    return { ok: true };
  } catch (error) {
    return toResult(error);
  }
}
