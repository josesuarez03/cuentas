'use server';

import { z } from 'zod';
import { db } from '@/db';
import { requireUser } from '@/features/auth/session';
import { toResult, type ActionResult } from '@/features/month/server/action-result';
import {
  createAccount, createCategory, renameCategory, setDefaultSplit, updateAccount,
} from './general';
import { updatePreferences } from './settings';

const INVALID = 'Revisa los datos.';

const name = z.string().trim().min(1).max(40);
const accountType = z.enum(['checking', 'savings', 'joint', 'credit_card', 'investment']);
const accountSchema = z.object({ name, bank: z.string().trim().max(40), type: accountType });
const newAccountSchema = accountSchema.extend({
  balanceCents: z.number().int().min(-100_000_000).max(100_000_000).nullable(),
});
const categorySchema = z.object({
  name,
  kind: z.enum(['income', 'expense']),
  parentId: z.uuid().nullable(),
});
const splitSchema = z.array(z.object({ accountId: z.uuid(), percent: z.number().int().min(0).max(100) })).min(1);
const preferencesSchema = z.object({
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
});

export async function createAccountAction(
  input: z.input<typeof newAccountSchema>,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = newAccountSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: INVALID };
  try {
    await createAccount(db, user.id, parsed.data);
    return { ok: true };
  } catch (error) {
    return toResult(error);
  }
}

export async function updateAccountAction(id: string, input: z.input<typeof accountSchema>): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = z.object({ id: z.uuid(), input: accountSchema }).safeParse({ id, input });
  if (!parsed.success) return { ok: false, error: INVALID };
  try {
    await updateAccount(db, user.id, parsed.data.id, parsed.data.input);
    return { ok: true };
  } catch (error) {
    return toResult(error);
  }
}

export async function createCategoryAction(input: z.input<typeof categorySchema>): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: INVALID };
  try {
    await createCategory(db, user.id, parsed.data);
    return { ok: true };
  } catch (error) {
    return toResult(error);
  }
}

export async function renameCategoryAction(id: string, newName: string): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = z.object({ id: z.uuid(), name }).safeParse({ id, name: newName });
  if (!parsed.success) return { ok: false, error: INVALID };
  try {
    await renameCategory(db, user.id, parsed.data.id, parsed.data.name);
    return { ok: true };
  } catch (error) {
    return toResult(error);
  }
}

export async function setDefaultSplitAction(split: { accountId: string; percent: number }[]): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = splitSchema.safeParse(split);
  if (!parsed.success) return { ok: false, error: INVALID };
  try {
    await setDefaultSplit(db, user.id, parsed.data);
    return { ok: true };
  } catch (error) {
    return toResult(error);
  }
}

export async function updatePreferencesAction(patch: z.input<typeof preferencesSchema>): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = preferencesSchema.safeParse(patch);
  if (!parsed.success) return { ok: false, error: INVALID };
  try {
    await updatePreferences(db, user.id, parsed.data);
    return { ok: true };
  } catch (error) {
    return toResult(error);
  }
}
