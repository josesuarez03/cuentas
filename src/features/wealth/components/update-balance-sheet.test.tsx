// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { AccountBalance } from '@/features/wealth/domain/types';
import { UpdateBalanceSheet } from './update-balance-sheet';

beforeAll(() => {
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    onchange: null,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
});
afterEach(cleanup);

const card: AccountBalance = { accountId: 't', name: 'Tarjeta BBVA', type: 'credit_card', realCents: -40000, realDate: '2026-10-20T00:00:00.000Z', estimatedCents: -40000, diffCents: 0, stale: false };
const checking: AccountBalance = { ...card, accountId: 'p', name: 'BBVA principal', type: 'checking', realCents: 100000, estimatedCents: 120000 };

describe('UpdateBalanceSheet', () => {
  it('cuenta normal: «Saldo de hoy» precargado con el estimado', async () => {
    const onSave = vi.fn();
    render(<UpdateBalanceSheet account={checking} open onOpenChange={vi.fn()} onSave={onSave} />);
    const input = screen.getByLabelText('Saldo de hoy (€)') as HTMLInputElement;
    expect(input.value).toBe('1.200,00');
    await userEvent.clear(input);
    await userEvent.type(input, '1.150,50');
    await userEvent.click(screen.getByRole('button', { name: 'Actualizar saldo' }));
    expect(onSave).toHaveBeenCalledWith(115050);
  });
  it('tarjeta: pide lo que debes en positivo y guarda en negativo', async () => {
    const onSave = vi.fn();
    render(<UpdateBalanceSheet account={card} open onOpenChange={vi.fn()} onSave={onSave} />);
    const input = screen.getByLabelText('Lo que debes (€)') as HTMLInputElement;
    expect(input.value).toBe('400,00');
    await userEvent.click(screen.getByRole('button', { name: 'Actualizar saldo' }));
    expect(onSave).toHaveBeenCalledWith(-40000);
  });
  it('importe no válido: mensaje y no guarda', async () => {
    const onSave = vi.fn();
    render(<UpdateBalanceSheet account={checking} open onOpenChange={vi.fn()} onSave={onSave} />);
    await userEvent.clear(screen.getByLabelText('Saldo de hoy (€)'));
    await userEvent.click(screen.getByRole('button', { name: 'Actualizar saldo' }));
    expect(screen.getByRole('alert').textContent).toBe('Escribe un importe, por ejemplo 1.250,00.');
    expect(onSave).not.toHaveBeenCalled();
  });
});
