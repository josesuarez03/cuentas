// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
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

it('avisa a la PWA que la abrió, se cierra y, si no se cierra, vuelve a Kuadrix', () => {
  const opener = { postMessage: vi.fn() };
  vi.stubGlobal('opener', opener);
  render(<SignedInReturn />);
  expect(opener.postMessage).toHaveBeenCalledWith({ type: 'kuadrix:signed-in' }, window.location.origin);
  expect(close).toHaveBeenCalled();
  vi.advanceTimersByTime(299);
  expect(replace).not.toHaveBeenCalled();
  vi.advanceTimersByTime(1);
  expect(replace).toHaveBeenCalledWith('/');
});

it('si postMessage falla, igual intenta cerrar y vuelve', () => {
  vi.stubGlobal('opener', { postMessage: () => { throw new Error('cerrada'); } });
  render(<SignedInReturn />);
  expect(close).toHaveBeenCalled();
  vi.advanceTimersByTime(300);
  expect(replace).toHaveBeenCalledWith('/');
});

it('muestra el aviso y un enlace a Kuadrix', () => {
  render(<SignedInReturn />);
  expect(screen.getByText('Has entrado. Volviendo a Kuadrix…')).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Ir a Kuadrix' }).getAttribute('href')).toBe('/');
});
