import { z } from 'zod';
import { SAVE_ERROR } from '@/features/month/save-error';
import { ClosedMonthError, NotFoundError } from './entries';

export type ActionResult = { ok: true } | { ok: false; error: string };

export function toResult(error: unknown): ActionResult {
  if (error instanceof NotFoundError || error instanceof ClosedMonthError || error instanceof RangeError) {
    return { ok: false, error: error.message };
  }
  console.error(error);
  return { ok: false, error: SAVE_ERROR };
}

export const cents = z.number().int().min(0).max(100_000_000);
export const positiveCents = z.number().int().min(1).max(100_000_000);
export const optionalNote = z.string().trim().max(80).nullable().transform((v) => (v ? v : null));
