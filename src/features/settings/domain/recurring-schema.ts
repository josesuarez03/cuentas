import { z } from 'zod';
import { positiveCents } from '@/features/month/server/action-result';
import { isYearMonth } from '@/lib/year-month';

export const recurringInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  kind: z.enum(['income', 'expense']),
  categoryId: z.uuid(),
  accountId: z.uuid(),
  amountCents: positiveCents,
  frequency: z.enum(['monthly', 'bimonthly', 'annual', 'installments']),
  startMonth: z.string().refine(isYearMonth),
  anchorMonth: z.number().int().min(1).max(12).nullable(),
  installmentsTotal: z.number().int().min(2).max(120).nullable(),
  paydayDay: z.number().int().min(1).max(31).nullable(),
}).superRefine((v, ctx) => {
  if (v.frequency === 'annual' && v.anchorMonth === null) {
    ctx.addIssue({ code: 'custom', path: ['anchorMonth'], message: 'Elige el mes en que se cobra.' });
  }
  if (v.frequency === 'installments' && v.installmentsTotal === null) {
    ctx.addIssue({ code: 'custom', path: ['installmentsTotal'], message: 'Indica el número de cuotas.' });
  }
});

export type RecurringInput = z.infer<typeof recurringInputSchema>;
