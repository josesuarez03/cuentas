// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { ConfirmIncomeDialog } from './confirm-income-dialog';

afterEach(cleanup);
const entry = { id: 'e1', name: 'Nómina', amountCents: 187000 };

it('precarga lo previsto y confirma el neto que escribe el usuario', async () => {
  const onConfirm = vi.fn();
  const onOpenChange = vi.fn();
  render(<ConfirmIncomeDialog entry={entry} open onOpenChange={onOpenChange} onConfirm={onConfirm} />);
  expect(screen.getByRole('dialog', { name: 'Confirmar Nómina' })).toBeTruthy();
  const input = screen.getByLabelText('Importe recibido (€)') as HTMLInputElement;
  expect(input.value).toBe('1.870,00');
  await userEvent.clear(input);
  await userEvent.type(input, '1790');
  await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
  expect(onConfirm).toHaveBeenCalledWith(179000);
  expect(onOpenChange).toHaveBeenCalledWith(false);
});

it('importe vacío, cero o no numérico: muestra el error y no confirma', async () => {
  const onConfirm = vi.fn();
  render(<ConfirmIncomeDialog entry={entry} open onOpenChange={() => {}} onConfirm={onConfirm} />);
  const input = screen.getByLabelText('Importe recibido (€)');
  for (const bad of ['abc', '0']) {
    await userEvent.clear(input);
    await userEvent.type(input, bad);
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(screen.getByRole('alert').textContent).toBe('Escribe un importe, por ejemplo 1.790,00.');
  }
  expect(onConfirm).not.toHaveBeenCalled();
});
