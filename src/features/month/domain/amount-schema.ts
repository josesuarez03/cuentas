import * as z from 'zod';

export const cents = z.number().int().min(0).max(100_000_000);
export const positiveCents = z.number().int().min(1).max(100_000_000);
export const optionalNote = z.string().trim().max(80).nullable().transform((v) => (v ? v : null));
