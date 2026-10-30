// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { SignOutSection } from './sign-out-section';

const mod = vi.hoisted(() => ({ signOutAndClear: vi.fn() }));
vi.mock('@/features/auth/sign-out', () => mod);
const toast = vi.hoisted(() => ({ error: vi.fn() }));
vi.mock('sonner', () => ({ toast }));

function setOnline(v: boolean) {
  Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => v });
}

const qc = new QueryClient();
const ui = () => render(<QueryClientProvider client={qc}><SignOutSection /></QueryClientProvider>);

afterEach(() => { cleanup(); vi.clearAllMocks(); setOnline(true); });

it('explica qué se borra y al pulsar cierra sesión con el QueryClient de la app', async () => {
  setOnline(true);
  mod.signOutAndClear.mockResolvedValue({ ok: true });
  ui();
  expect(screen.getByText('Se borran de este dispositivo los datos guardados para usar sin conexión.')).toBeTruthy();
  await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
  expect(mod.signOutAndClear).toHaveBeenCalledWith(qc);
  expect(toast.error).not.toHaveBeenCalled();
});

it('sin conexión, el botón está desactivado', () => {
  setOnline(false);
  ui();
  expect((screen.getByRole('button', { name: 'Cerrar sesión' }) as HTMLButtonElement).disabled).toBe(true);
});

it('si falla, avisa con un toast y vuelve a dejar pulsar', async () => {
  setOnline(true);
  mod.signOutAndClear.mockResolvedValue({ ok: false });
  ui();
  const button = screen.getByRole('button', { name: 'Cerrar sesión' }) as HTMLButtonElement;
  await userEvent.click(button);
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith('No se ha podido cerrar sesión. Inténtalo de nuevo.'));
  expect(button.disabled).toBe(false);
});
