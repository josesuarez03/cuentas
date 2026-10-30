// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { useOnline } from './use-online';

const setOnline = (v: boolean) => Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => v });
afterEach(() => setOnline(true));

it('sigue a navigator.onLine y a los eventos online/offline', () => {
  setOnline(true);
  const { result } = renderHook(() => useOnline());
  expect(result.current).toBe(true);
  act(() => { setOnline(false); window.dispatchEvent(new Event('offline')); });
  expect(result.current).toBe(false);
  act(() => { setOnline(true); window.dispatchEvent(new Event('online')); });
  expect(result.current).toBe(true);
});
