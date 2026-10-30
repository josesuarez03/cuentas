// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { LoginButton } from './login-button';

const auth = vi.hoisted(() => ({ getSession: vi.fn(), signIn: { social: vi.fn() } }));
vi.mock('@/features/auth/auth-client', () => ({ authClient: auth }));

const replace = vi.fn();
let visibility: DocumentVisibilityState = 'visible';

beforeEach(() => {
  vi.stubGlobal('location', { ...window.location, replace });
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility });
  visibility = 'visible';
});
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.unstubAllGlobals(); });

const SIGNED_IN = { data: { session: { id: 's1' }, user: { id: 'u1' } }, error: null };
const SIGNED_OUT = { data: null, error: null };

function showAgain() {
  visibility = 'visible';
  document.dispatchEvent(new Event('visibilitychange'));
}

it('al volver a la PWA con sesión (cerrada la ventana de Google), entra', async () => {
  auth.getSession.mockResolvedValue(SIGNED_IN);
  render(<LoginButton callbackURL="/inicio" />);
  act(() => showAgain());
  await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
});

it('también comprueba en pageshow restaurado y en focus', async () => {
  auth.getSession.mockResolvedValue(SIGNED_IN);
  render(<LoginButton callbackURL="/inicio" />);
  const restored = new Event('pageshow') as PageTransitionEvent;
  Object.defineProperty(restored, 'persisted', { value: true });
  act(() => { window.dispatchEvent(restored); });
  await waitFor(() => expect(replace).toHaveBeenCalledTimes(1));
  act(() => { window.dispatchEvent(new Event('focus')); });
  await waitFor(() => expect(replace).toHaveBeenCalledTimes(2));
});

it('pageshow no restaurado y ocultarse no comprueban', () => {
  render(<LoginButton callbackURL="/inicio" />);
  act(() => {
    window.dispatchEvent(new Event('pageshow'));
    visibility = 'hidden';
    document.dispatchEvent(new Event('visibilitychange'));
  });
  expect(auth.getSession).not.toHaveBeenCalled();
});

it('sin sesión al volver, el botón deja de estar en «Abriendo Google…»', async () => {
  auth.signIn.social.mockReturnValue(new Promise(() => {}));
  auth.getSession.mockResolvedValue(SIGNED_OUT);
  render(<LoginButton callbackURL="/inicio" />);
  await userEvent.click(screen.getByRole('button', { name: 'Entrar con Google' }));
  expect(screen.getByRole('button', { name: 'Abriendo Google…' })).toBeTruthy();
  act(() => showAgain());
  expect(await screen.findByRole('button', { name: 'Entrar con Google' })).toBeTruthy();
  expect(replace).not.toHaveBeenCalled();
});

it('no apila comprobaciones a la vez', async () => {
  let resolve!: (v: typeof SIGNED_OUT) => void;
  auth.getSession.mockReturnValue(new Promise((r) => { resolve = r; }));
  render(<LoginButton callbackURL="/inicio" />);
  act(() => {
    showAgain();
    window.dispatchEvent(new Event('focus'));
    showAgain();
  });
  expect(auth.getSession).toHaveBeenCalledTimes(1);
  await act(async () => { resolve(SIGNED_OUT); });
  auth.getSession.mockResolvedValue(SIGNED_OUT);
  act(() => { window.dispatchEvent(new Event('focus')); });
  await waitFor(() => expect(auth.getSession).toHaveBeenCalledTimes(2));
});

it('si getSession falla (sin red), se queda en /login sin romper', async () => {
  auth.getSession.mockRejectedValue(new TypeError('Failed to fetch'));
  render(<LoginButton callbackURL="/inicio" />);
  act(() => showAgain());
  await waitFor(() => expect(auth.getSession).toHaveBeenCalled());
  expect(replace).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Entrar con Google' })).toBeTruthy();
});
