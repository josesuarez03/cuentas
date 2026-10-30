import { z } from 'zod';

export const BASE_CATEGORIES = [
  { name: 'Ingresos', kind: 'income' },
  { name: 'Piso', kind: 'expense' },
  { name: 'Comida', kind: 'expense' },
  { name: 'Suscripciones', kind: 'expense' },
  { name: 'Otros', kind: 'expense' },
] as const;

export const BASE_ITEMS = [
  { name: 'Alquiler', category: 'Piso' },
  { name: 'Luz', category: 'Piso' },
  { name: 'Internet', category: 'Piso' },
  { name: 'Supermercado', category: 'Comida' },
  { name: 'Móvil', category: 'Suscripciones' },
] as const;

const accountSchema = z.object({
  name: z.string().trim().min(1).max(40),
  bank: z.string().trim().max(40),
  type: z.enum(['checking', 'savings', 'joint', 'credit_card', 'investment']),
  balanceCents: z.number().int().min(0).max(100_000_000).nullable(),
});

const salarySchema = z.object({
  amountCents: z.number().int().min(1).max(100_000_000),
  accountIndex: z.number().int().min(0),
  paydayDay: z.number().int().min(1).max(31),
});

const itemSchema = z.object({
  name: z.string().trim().min(1).max(80),
  category: z.enum(['Piso', 'Comida', 'Suscripciones', 'Otros']),
  amountCents: z.number().int().min(1).max(100_000_000),
  accountIndex: z.number().int().min(0),
});

export const onboardingSchema = z.object({
  accounts: z.array(accountSchema).min(1).max(8),
  salary: salarySchema.nullable(),
  items: z.array(itemSchema).max(20),
}).superRefine((value, ctx) => {
  const check = (index: number, path: (string | number)[]) => {
    if (index >= value.accounts.length) ctx.addIssue({ code: 'custom', message: 'Elige una de tus cuentas.', path });
  };
  if (value.salary) check(value.salary.accountIndex, ['salary', 'accountIndex']);
  value.items.forEach((item, i) => check(item.accountIndex, ['items', i, 'accountIndex']));
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
