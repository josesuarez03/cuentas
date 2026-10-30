// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { FundSpendDialog } from './fund-spend-dialog';
import { LoanForm } from './loan-form';
import { PocketExpenseForm } from './pocket-expense-form';

const online = vi.hoisted(() => ({ useOnline: vi.fn(() => true) }));
vi.mock('@/shared/hooks/use-online', () => online);
vi.mock('@/features/month/server/actions', () => ({ addOneOffEntryAction: vi.fn() }));
vi.mock('@/features/month/server/loan-actions', () => ({ lendMoneyAction: vi.fn() }));
vi.mock('@/features/month/server/pocket-actions', () => ({ addPocketExpenseAction: vi.fn(), spendFromFundAction: vi.fn() }));

beforeAll(() => {
  window.matchMedia ??= ((query: string) => ({
    matches: false, media: query, addEventListener: () => {}, removeEventListener: () => {},
    addListener: () => {}, removeListener: () => {}, onchange: null, dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
});
afterEach(() => { cleanup(); online.useOnline.mockReturnValue(true); });

function wrap(ui: React.ReactElement) {
  return render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);
}
const isDisabled = (name: string) => (screen.getByRole('button', { name }) as HTMLButtonElement).disabled;

it('sin conexión, el envío del préstamo queda desactivado', () => {
  online.useOnline.mockReturnValue(false);
  wrap(<LoanForm ym="2026-10" accounts={[{ id: 'a1', name: 'BBVA', type: 'checking' } as never]} onDone={vi.fn()} />);
  const submit = document.querySelector('button[type="submit"]') as HTMLButtonElement;
  expect(submit.disabled).toBe(true);
});

it('sin conexión, Apuntar gasto de bolsa queda desactivado', () => {
  online.useOnline.mockReturnValue(false);
  wrap(<PocketExpenseForm ym="2026-10" pockets={[{ id: 'p1', name: 'Ocio', limitCents: 10000, spentCents: 0 }]} onDone={vi.fn()} />);
  expect(isDisabled('Apuntar gasto')).toBe(true);
});

it('sin conexión, Gastar de hucha queda desactivado', () => {
  online.useOnline.mockReturnValue(false);
  wrap(<FundSpendDialog open onOpenChange={vi.fn()} ym="2026-10" fund={{ id: 'f1', name: 'Viajes', allocatedCents: 0, balanceCents: 5000 }} />);
  expect(isDisabled('Gastar')).toBe(true);
});
