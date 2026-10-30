// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { OfflineBanner } from './offline-banner';

const setOnline = (v: boolean) => Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => v });
afterEach(() => { cleanup(); setOnline(true); });

it('con conexión la región existe y está vacía', () => {
  render(<OfflineBanner />);
  expect(screen.getByRole('status').textContent).toBe('');
});

it('sin conexión avisa de que solo se puede leer', () => {
  render(<OfflineBanner />);
  act(() => { setOnline(false); window.dispatchEvent(new Event('offline')); });
  expect(screen.getByRole('status').textContent).toBe('Sin conexión · Ves los últimos datos guardados en este dispositivo. Para cambiar algo, vuelve a conectarte.');
});
