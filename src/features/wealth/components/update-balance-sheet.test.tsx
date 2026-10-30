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
  it('cuenta en descubierto: precarga «−500,00» y guarda el negativo', async () => {
    const onSave = vi.fn();
    render(<UpdateBalanceSheet account={{ ...checking, estimatedCents: -50000 }} open onOpenChange={vi.fn()} onSave={onSave} />);
    expect((screen.getByLabelText('Saldo de hoy (€)') as HTMLInputElement).value).toBe('\u2212500,00');
    await userEvent.click(screen.getByRole('button', { name: 'Actualizar saldo' }));
    expect(onSave).toHaveBeenCalledWith(-50000);
  });
  it('tarjeta con −300 real: precarga «300,00» y «250» guarda −25000', async () => {
    const onSave = vi.fn();
    render(<UpdateBalanceSheet account={{ ...card, realCents: -30000, estimatedCents: null }} open onOpenChange={vi.fn()} onSave={onSave} />);
    const input = screen.getByLabelText('Lo que debes (€)') as HTMLInputElement;
    expect(input.value).toBe('300,00');
    await userEvent.clear(input);
    await userEvent.type(input, '250');
    await userEvent.click(screen.getByRole('button', { name: 'Actualizar saldo' }));
    expect(onSave).toHaveBeenCalledWith(-25000);
  });
  it('cuenta de ahorro: «-12,5» guarda −1250', async () => {
    const onSave = vi.fn();
    render(<UpdateBalanceSheet account={{ ...checking, type: 'savings' }} open onOpenChange={vi.fn()} onSave={onSave} />);
    const input = screen.getByLabelText('Saldo de hoy (€)');
    await userEvent.clear(input);
    await userEvent.type(input, '-12,5');
    await userEvent.click(screen.getByRole('button', { name: 'Actualizar saldo' }));
    expect(onSave).toHaveBeenCalledWith(-1250);
  });
});
