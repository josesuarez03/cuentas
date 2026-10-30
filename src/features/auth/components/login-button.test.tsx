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

function installedApp(on: boolean) {
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: on && q === '(display-mode: standalone)', media: q, addEventListener() {}, removeEventListener() {} }));
}

it('en navegador normal: redirección de siempre, sin ventana aparte', async () => {
  installedApp(false);
  const open = vi.spyOn(window, 'open');
  auth.signIn.social.mockReturnValue(new Promise(() => {}));
  render(<LoginButton callbackURL="/inicio" />);
  await userEvent.click(screen.getByRole('button', { name: 'Entrar con Google' }));
  expect(open).not.toHaveBeenCalled();
  expect(auth.signIn.social).toHaveBeenCalledWith({ provider: 'google', callbackURL: '/inicio', errorCallbackURL: '/login?error=acceso' });
});

it('instalada: abre la ventana antes de esperar a Better Auth y la lleva a Google', async () => {
  installedApp(true);
  const popup = { location: { href: 'about:blank' }, close: vi.fn() };
  const open = vi.spyOn(window, 'open').mockReturnValue(popup as unknown as Window);
  let resolve!: (v: unknown) => void;
  auth.signIn.social.mockReturnValue(new Promise((r) => { resolve = r; }));
  render(<LoginButton callbackURL="/inicio" />);
  await userEvent.click(screen.getByRole('button', { name: 'Entrar con Google' }));
  expect(open).toHaveBeenCalledWith('about:blank', '_blank');
  expect(auth.signIn.social).toHaveBeenCalledWith({
    provider: 'google', callbackURL: '/entrar/listo', errorCallbackURL: '/login?error=acceso', disableRedirect: true,
  });
  expect(open.mock.invocationCallOrder[0]).toBeLessThan(auth.signIn.social.mock.invocationCallOrder[0]!);
  await act(async () => { resolve({ data: { url: 'https://accounts.google.com/o/oauth2/auth?x=1', redirect: false }, error: null }); });
  expect(popup.location.href).toBe('https://accounts.google.com/o/oauth2/auth?x=1');
  expect(popup.close).not.toHaveBeenCalled();
  expect(auth.signIn.social).toHaveBeenCalledTimes(1);
});

it('instalada, pero el navegador bloquea la ventana: redirección de siempre', async () => {
  installedApp(true);
  vi.spyOn(window, 'open').mockReturnValue(null);
  auth.signIn.social.mockReturnValue(new Promise(() => {}));
  render(<LoginButton callbackURL="/inicio" />);
  await userEvent.click(screen.getByRole('button', { name: 'Entrar con Google' }));
  expect(auth.signIn.social).toHaveBeenCalledTimes(1);
  expect(auth.signIn.social).toHaveBeenCalledWith({ provider: 'google', callbackURL: '/inicio', errorCallbackURL: '/login?error=acceso' });
});

it('instalada, si Better Auth falla: cierra la ventana y prueba la redirección de siempre', async () => {
  installedApp(true);
  const popup = { location: { href: 'about:blank' }, close: vi.fn() };
  vi.spyOn(window, 'open').mockReturnValue(popup as unknown as Window);
  auth.signIn.social
    .mockResolvedValueOnce({ data: null, error: { status: 500 } })
    .mockReturnValueOnce(new Promise(() => {}));
  render(<LoginButton callbackURL="/inicio" />);
  await userEvent.click(screen.getByRole('button', { name: 'Entrar con Google' }));
  await waitFor(() => expect(auth.signIn.social).toHaveBeenCalledTimes(2));
  expect(popup.close).toHaveBeenCalled();
  expect(auth.signIn.social).toHaveBeenLastCalledWith({ provider: 'google', callbackURL: '/inicio', errorCallbackURL: '/login?error=acceso' });
});

it('también cuenta como instalada con navigator.standalone (iOS)', async () => {
  installedApp(false);
  vi.stubGlobal('navigator', Object.assign(Object.create(navigator) as Navigator, { standalone: true }));
  const open = vi.spyOn(window, 'open').mockReturnValue(null);
  auth.signIn.social.mockReturnValue(new Promise(() => {}));
  render(<LoginButton callbackURL="/inicio" />);
  await userEvent.click(screen.getByRole('button', { name: 'Entrar con Google' }));
  expect(open).toHaveBeenCalledWith('about:blank', '_blank');
});

function message(data: unknown, origin = window.location.origin) {
  window.dispatchEvent(new MessageEvent('message', { data, origin }));
}

it('cuando la ventana avisa de que ya ha entrado, la PWA entra', () => {
  render(<LoginButton callbackURL="/inicio" />);
  act(() => message({ type: 'kuadrix:signed-in' }));
  expect(replace).toHaveBeenCalledWith('/inicio');
});

it('si la ventana avisa de que el email no tiene acceso, la PWA lo muestra', () => {
  render(<LoginButton callbackURL="/inicio" />);
  act(() => message({ type: 'kuadrix:signin-error' }));
  expect(replace).toHaveBeenCalledWith('/login?error=acceso');
});

it('ignora mensajes de otro origen o de otro tipo, y deja de escuchar al desmontarse', () => {
  const { unmount } = render(<LoginButton callbackURL="/inicio" />);
  act(() => {
    message({ type: 'kuadrix:signed-in' }, 'https://evil.example');
    message({ type: 'otra-cosa' });
    message(null);
  });
  expect(replace).not.toHaveBeenCalled();
  unmount();
  act(() => message({ type: 'kuadrix:signed-in' }));
  expect(replace).not.toHaveBeenCalled();
});

it('abierta como ventana de la PWA con ?error=acceso: avisa a la PWA y se cierra', () => {
  const opener = { location: { origin: window.location.origin }, postMessage: vi.fn() };
  const close = vi.fn();
  vi.stubGlobal('location', { ...window.location, replace, search: '?error=acceso' });
  vi.stubGlobal('opener', opener);
  vi.stubGlobal('close', close);
  render(<LoginButton callbackURL="/" />);
  expect(opener.postMessage).toHaveBeenCalledWith({ type: 'kuadrix:signin-error' }, window.location.origin);
  expect(close).toHaveBeenCalled();
});

it('con ?error=acceso pero sin ventana que la abriera: se queda mostrando el error', () => {
  const close = vi.fn();
  vi.stubGlobal('location', { ...window.location, replace, search: '?error=acceso' });
  vi.stubGlobal('close', close);
  render(<LoginButton callbackURL="/" />);
  expect(close).not.toHaveBeenCalled();
});
