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
