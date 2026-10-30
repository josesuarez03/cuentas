'use server';

import { db } from '@/db';
import { requireUser } from '@/features/auth/session';
import { toResult, type ActionResult } from '@/features/month/server/action-result';
import { currentYearMonth } from '@/lib/year-month';
import { onboardingSchema, type OnboardingInput } from '../domain/onboarding';
import { completeOnboarding } from './onboarding';

export async function completeOnboardingAction(input: OnboardingInput): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  try {
    await completeOnboarding(db, user.id, parsed.data, currentYearMonth());
    return { ok: true };
  } catch (error) {
    return toResult(error);
  }
}
