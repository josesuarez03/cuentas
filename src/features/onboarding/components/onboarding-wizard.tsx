'use client';

import { useForm } from '@tanstack/react-form';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { BASE_ITEMS, onboardingSchema, type OnboardingInput } from '@/features/onboarding/domain/onboarding';
import { completeOnboardingAction } from '@/features/onboarding/server/actions';
import { parseEuros } from '@/lib/money';
import { Button } from '@/shared/components/ui/button';
import { AccountsStep } from './accounts-step';
import { ItemsStep } from './items-step';
import { SalaryStep } from './salary-step';

type AccountValues = { name: string; bank: string; type: OnboardingInput['accounts'][number]['type']; balance: string };
interface WizardValues {
  accounts: AccountValues[];
  salary: { amount: string; accountIndex: string; paydayDay: string };
  items: { name: string; category: string; amount: string; accountIndex: string }[];
}

const defaultValues: WizardValues = {
  accounts: [{ name: '', bank: '', type: 'checking', balance: '' }],
  salary: { amount: '', accountIndex: '0', paydayDay: '' },
  items: BASE_ITEMS.map((i) => ({ ...i, amount: '', accountIndex: '0' })),
};

function useWizardForm() {
  return useForm({ defaultValues });
}
export type WizardForm = ReturnType<typeof useWizardForm>;

const TITLES = { 1: 'Tus cuentas', 2: 'Tu nómina', 3: 'Gastos de cada mes' } as const;

function buildInput(values: WizardValues, skipSalary: boolean): OnboardingInput {
  const index = (value: string) => {
    const n = Number(value);
    return Number.isInteger(n) && n >= 0 && n < values.accounts.length ? n : 0;
  };
  const salaryCents = parseEuros(values.salary.amount);
  return {
    accounts: values.accounts.map((a) => ({
      name: a.name,
      bank: a.bank,
      type: a.type,
      balanceCents: a.balance.trim() === '' ? null : parseEuros(a.balance),
    })),
    salary: skipSalary || salaryCents === null
      ? null
      : { amountCents: salaryCents, accountIndex: index(values.salary.accountIndex), paydayDay: Number(values.salary.paydayDay) },
    items: values.items.flatMap((i) => {
      const cents = parseEuros(i.amount);
      return cents === null ? [] : [{ name: i.name, category: i.category as OnboardingInput['items'][number]['category'], amountCents: cents, accountIndex: index(i.accountIndex) }];
    }),
  };
}

export function OnboardingWizard() {
  const router = useRouter();
  const form = useWizardForm();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [skipSalary, setSkipSalary] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef(step);

  useEffect(() => {
    if (previousStep.current !== step) headingRef.current?.focus();
    previousStep.current = step;
  }, [step]);

  async function stepIsValid(): Promise<boolean> {
    const names: string[] = [];
    if (step === 1) {
      form.state.values.accounts.forEach((_, i) => names.push(`accounts[${i}].name`, `accounts[${i}].balance`));
    } else if (step === 2) {
      names.push('salary.amount', 'salary.paydayDay');
    } else {
      form.state.values.items.forEach((_, i) => names.push(`items[${i}].amount`));
    }
    let valid = true;
    for (const name of names) {
      const errors = await form.validateField(name as never, 'change');
      if (errors.length > 0) valid = false;
    }
    return valid;
  }

  async function next() {
    setError(null);
    if (!(await stepIsValid())) return;
    setSkipSalary(false);
    setStep((s) => (s < 3 ? ((s + 1) as 2 | 3) : s));
  }

  function skip() {
    setError(null);
    setSkipSalary(true);
    setStep(3);
  }

  async function finish() {
    setError(null);
    if (!(await stepIsValid())) return;
    const parsed = onboardingSchema.safeParse(buildInput(form.state.values, skipSalary));
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setSubmitting(true);
    const result = await completeOnboardingAction(parsed.data);
    if (result.ok) {
      router.replace('/inicio');
      return;
    }
    setSubmitting(false);
    setError(result.error);
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <header>
        <p className="text-[28px] leading-8 font-semibold tracking-[-0.03em] text-ink">Kuadrix</p>
        <div aria-hidden className="mt-2 h-1 w-full border-y border-ink" />
        <h1 className="mt-4 text-[24px] leading-8 font-semibold text-ink">Te damos la bienvenida</h1>
        <p aria-live="polite" className="mt-1 text-[13px] text-ink-muted">Paso {step} de 3</p>
      </header>

      <section aria-labelledby="paso-titulo" className="flex flex-col gap-4">
        <h2 id="paso-titulo" ref={headingRef} tabIndex={-1} className="text-[19px] font-semibold text-ink outline-none focus-visible:ring-2 focus-visible:ring-ring">{TITLES[step]}</h2>
        {step === 1 && <AccountsStep form={form} />}
        {step === 2 && <SalaryStep form={form} />}
        {step === 3 && <ItemsStep form={form} />}
      </section>

      {error && <p role="alert" className="text-[13px] text-alerta">{error}</p>}

      <footer className="flex flex-col gap-3">
        <Button
          type="button"
          className="min-h-12 text-base"
          disabled={submitting}
          onClick={step === 3 ? finish : next}
        >
          {step === 3 ? 'Empezar' : 'Siguiente'}
        </Button>
        {step === 2 && (
          <Button type="button" variant="ghost" className="min-h-11" onClick={skip}>Saltar</Button>
        )}
        {step > 1 && (
          <Button type="button" variant="ghost" className="min-h-11" onClick={() => { setError(null); setStep((s) => (s - 1) as 1 | 2); }}>
            Atrás
          </Button>
        )}
      </footer>
    </div>
  );
}
