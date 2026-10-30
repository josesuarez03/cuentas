// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { SignedInReturn } from './signed-in-return';

const replace = vi.fn();
const close = vi.fn();

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('location', { ...window.location, replace });
  vi.stubGlobal('close', close);
});
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

it('avisa a la PWA que la abrió, se cierra y, si iOS no la deja cerrar, pide tocar ✕ sin cargar la app aquí', () => {
  const opener = { postMessage: vi.fn() };
  vi.stubGlobal('opener', opener);
  render(<SignedInReturn />);
  expect(opener.postMessage).toHaveBeenCalledWith({ type: 'kuadrix:signed-in' }, window.location.origin);
  expect(close).toHaveBeenCalled();
  act(() => { vi.advanceTimersByTime(300); });
  expect(replace).not.toHaveBeenCalled();
  expect(screen.getByText(/Toca ✕ arriba para volver a Kuadrix/)).toBeTruthy();
});

it('si postMessage falla, igual intenta cerrar', () => {
  vi.stubGlobal('opener', { postMessage: () => { throw new Error('cerrada'); } });
  render(<SignedInReturn />);
  expect(close).toHaveBeenCalled();
});

it('si esta ventana es la propia app instalada, sigue a Kuadrix aquí', () => {
  vi.stubGlobal('opener', null);
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  render(<SignedInReturn />);
  act(() => { vi.advanceTimersByTime(300); });
  expect(replace).toHaveBeenCalledWith('/');
});

it('muestra el aviso y un enlace a Kuadrix', () => {
  vi.stubGlobal('opener', { postMessage: vi.fn() });
  render(<SignedInReturn />);
  expect(screen.getByText('Has entrado. Volviendo a Kuadrix…')).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Ir a Kuadrix' }).getAttribute('href')).toBe('/');
});
