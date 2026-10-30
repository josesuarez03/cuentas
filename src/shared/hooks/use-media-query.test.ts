// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DESKTOP_QUERY, useMediaQuery } from './use-media-query';

function mockMatchMedia(initial: boolean) {
  let matches = initial;
  const listeners = new Set<() => void>();
  window.matchMedia = ((query: string) => ({
    get matches() { return matches; },
    media: query,
    addEventListener: (_: string, l: () => void) => listeners.add(l),
    removeEventListener: (_: string, l: () => void) => listeners.delete(l),
  })) as unknown as typeof window.matchMedia;
  return { set(next: boolean) { matches = next; listeners.forEach((l) => l()); } };
}

describe('useMediaQuery', () => {
  it('sigue a la media query', () => {
    const mq = mockMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery(DESKTOP_QUERY));
    expect(result.current).toBe(false);
    act(() => mq.set(true));
    expect(result.current).toBe(true);
  });
});
