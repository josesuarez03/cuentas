// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { AccountBalance } from '@/features/wealth/domain/types';
import { AccountList } from './account-list';

const online = vi.hoisted(() => ({ useOnline: vi.fn(() => true) }));
vi.mock('@/shared/hooks/use-online', () => online);
afterEach(cleanup);

const account: AccountBalance = { accountId: 'a1', name: 'BBVA principal', type: 'checking', realCents: 100000, realDate: '2026-10-01', estimatedCents: 100000, diffCents: 0, stale: false };

it('con conexión se puede actualizar el saldo', () => {
  render(<AccountList accounts={[account]} onUpdate={vi.fn()} />);
  expect((screen.getByRole('button', { name: 'Actualizar saldo de BBVA principal' }) as HTMLButtonElement).disabled).toBe(false);
});

it('sin conexión, Actualizar está desactivado', () => {
  online.useOnline.mockReturnValue(false);
  render(<AccountList accounts={[account]} onUpdate={vi.fn()} />);
  expect((screen.getByRole('button', { name: 'Actualizar saldo de BBVA principal' }) as HTMLButtonElement).disabled).toBe(true);
});
