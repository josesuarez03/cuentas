// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { clearPendingHandoff, savePendingHandoff } from '@/features/auth/pwa-handoff';
import { LoginButton } from './login-button';

const auth = vi.hoisted(() => ({ getSession: vi.fn(), signIn: { social: vi.fn() } }));
vi.mock('@/features/auth/auth-client', () => ({ authClient: auth }));

const replace = vi.fn();
const fetch = vi.fn();
let visibility: DocumentVisibilityState = 'visible';

beforeEach(() => {
  vi.stubGlobal('location', { ...window.location, replace });
  fetch.mockImplementation(async () => new Response('{}', { status: 404 }));
  vi.stubGlobal('fetch', fetch);
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility });
  visibility = 'visible';
});
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); clearPendingHandoff(); sessionStorage.clear(); });

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

const recogidas = () => fetch.mock.calls.filter(([url]) => url === '/api/entrar/recoger');
const H = 'q'.repeat(43);

it('en navegador normal: redirección de siempre, sin código ni ventana aparte', async () => {
  installedApp(false);
  const open = vi.spyOn(window, 'open');
  auth.signIn.social.mockReturnValue(new Promise(() => {}));
  render(<LoginButton callbackURL="/inicio" />);
  await userEvent.click(screen.getByRole('button', { name: 'Entrar con Google' }));
  expect(open).not.toHaveBeenCalled();
  expect(auth.signIn.social).toHaveBeenCalledWith({ provider: 'google', callbackURL: '/inicio', errorCallbackURL: '/login?error=acceso' });
  expect(sessionStorage.getItem('kuadrix:entrar')).toBeNull();
});

it('instalada: va a Google en la misma ventana y vuelve a /entrar/listo con un código que guarda la PWA', async () => {
  installedApp(true);
  const open = vi.spyOn(window, 'open');
  auth.signIn.social.mockReturnValue(new Promise(() => {}));
  render(<LoginButton callbackURL="/mes/2026-10" />);
  await userEvent.click(screen.getByRole('button', { name: 'Entrar con Google' }));
  expect(open).not.toHaveBeenCalled();
  const saved = JSON.parse(sessionStorage.getItem('kuadrix:entrar')!) as { h: string; next: string };
  expect(saved.h).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(saved.next).toBe('/mes/2026-10');
  expect(auth.signIn.social).toHaveBeenCalledWith({
    provider: 'google', callbackURL: `/entrar/listo?h=${saved.h}`, errorCallbackURL: '/login?error=acceso',
  });
});

it('también cuenta como instalada con navigator.standalone (iOS)', async () => {
  installedApp(false);
  vi.stubGlobal('navigator', Object.assign(Object.create(navigator) as Navigator, { standalone: true }));
  auth.signIn.social.mockReturnValue(new Promise(() => {}));
  render(<LoginButton callbackURL="/inicio" />);
  await userEvent.click(screen.getByRole('button', { name: 'Entrar con Google' }));
  expect(auth.signIn.social.mock.calls[0][0].callbackURL).toMatch(/^\/entrar\/listo\?h=[A-Za-z0-9_-]{43}$/);
});

it('instalada: pregunta cada 2 s si ya puede recoger la sesión y, cuando sí, entra al destino', async () => {
  vi.useFakeTimers();
  installedApp(true);
  auth.signIn.social.mockReturnValue(new Promise(() => {}));
  render(<LoginButton callbackURL="/mes/2026-10" />);
  act(() => { fireEvent.click(screen.getByRole('button', { name: 'Entrar con Google' })); });
  const h = (JSON.parse(sessionStorage.getItem('kuadrix:entrar')!) as { h: string }).h;
  await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
  expect(recogidas()).toHaveLength(1);
  expect(recogidas()[0][1].body).toBe(JSON.stringify({ h }));
  expect(replace).not.toHaveBeenCalled();
  fetch.mockImplementation(async () => new Response(null, { status: 204 }));
  await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
  expect(replace).toHaveBeenCalledWith('/mes/2026-10');
  expect(sessionStorage.getItem('kuadrix:entrar')).toBeNull();
  await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });
  expect(recogidas()).toHaveLength(2);
});

it('deja de preguntar a los 5 minutos y al desmontarse', async () => {
  vi.useFakeTimers();
  installedApp(true);
  auth.signIn.social.mockReturnValue(new Promise(() => {}));
  const { unmount } = render(<LoginButton callbackURL="/inicio" />);
  act(() => { fireEvent.click(screen.getByRole('button', { name: 'Entrar con Google' })); });
  await act(async () => { await vi.advanceTimersByTimeAsync(5 * 60_000 + 10_000); });
  const n = recogidas().length;
  expect(n).toBeGreaterThanOrEqual(149);
  expect(n).toBeLessThanOrEqual(150);
  await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });
  expect(recogidas()).toHaveLength(n);

  clearPendingHandoff();
  act(() => { fireEvent.click(screen.getByRole('button', { name: /Entrar con Google|Abriendo Google…/ })); });
  unmount();
  await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });
  expect(recogidas()).toHaveLength(n);
});

it('al volver a verse la PWA, recoge enseguida sin esperar a la siguiente vuelta', async () => {
  auth.getSession.mockResolvedValue(SIGNED_OUT);
  render(<LoginButton callbackURL="/inicio" />);
  savePendingHandoff({ h: H, next: '/inicio', startedAt: Date.now() });
  fetch.mockImplementation(async () => new Response(null, { status: 204 }));
  act(() => showAgain());
  await waitFor(() => expect(replace).toHaveBeenCalledWith('/inicio'));
});

it('si al abrir /login queda un código pendiente (la app se reabrió), lo recoge una vez', async () => {
  sessionStorage.setItem('kuadrix:entrar', JSON.stringify({ h: H, next: '/ajustes', startedAt: Date.now() }));
  fetch.mockImplementation(async () => new Response(null, { status: 204 }));
  render(<LoginButton callbackURL="/inicio" />);
  await waitFor(() => expect(replace).toHaveBeenCalledWith('/ajustes'));
  expect(recogidas()).toHaveLength(1);
});

it('sin código pendiente, no pregunta al servidor', async () => {
  auth.getSession.mockResolvedValue(SIGNED_OUT);
  render(<LoginButton callbackURL="/inicio" />);
  act(() => showAgain());
  await waitFor(() => expect(auth.getSession).toHaveBeenCalled());
  expect(recogidas()).toHaveLength(0);
});

it('si Better Auth falla al empezar, vuelve el botón y olvida el código', async () => {
  installedApp(true);
  auth.signIn.social.mockResolvedValue({ data: null, error: { status: 500 } });
  render(<LoginButton callbackURL="/inicio" />);
  await userEvent.click(screen.getByRole('button', { name: 'Entrar con Google' }));
  expect(await screen.findByRole('button', { name: 'Entrar con Google' })).toBeTruthy();
  expect(sessionStorage.getItem('kuadrix:entrar')).toBeNull();
});
