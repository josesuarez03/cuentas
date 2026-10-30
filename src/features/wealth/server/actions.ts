'use server';

import { z } from 'zod';
import { db } from '@/db';
import { requireUser } from '@/features/auth/session';
import { toResult, type ActionResult } from '@/features/month/server/action-result';
import { addBalanceSnapshot } from './wealth';

const schema = z.object({ accountId: z.uuid(), balanceCents: z.number().int().min(-100_000_000).max(100_000_000) });

export async function addBalanceSnapshotAction(accountId: string, balanceCents: number): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = schema.safeParse({ accountId, balanceCents });
  if (!parsed.success) return { ok: false, error: 'Saldo no válido.' };
  try {
    await addBalanceSnapshot(db, user.id, parsed.data.accountId, parsed.data.balanceCents);
    return { ok: true };
  } catch (error) {
    return toResult(error);
  }
}
