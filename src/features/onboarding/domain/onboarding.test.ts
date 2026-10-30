import { describe, expect, it } from 'vitest';
import { onboardingSchema } from './onboarding';

const valid = { accounts: [{ name: 'BBVA', bank: 'BBVA', type: 'checking', balanceCents: 230000 }], salary: { amountCents: 187000, accountIndex: 0, paydayDay: 27 }, items: [] };

describe('onboardingSchema', () => {
  it('acepta lo mínimo y rechaza sin cuentas o con cuentas inexistentes', () => {
    expect(onboardingSchema.safeParse(valid).success).toBe(true);
    expect(onboardingSchema.safeParse({ ...valid, accounts: [] }).success).toBe(false);
    const bad = onboardingSchema.safeParse({ ...valid, salary: { ...valid.salary, accountIndex: 1 } });
    expect(bad.error!.issues[0].message).toBe('Elige una de tus cuentas.');
  });
});
