// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { ThemeProvider } from '@/shared/components/providers';
import { ThemeControl } from './theme-control';

beforeAll(() => {
  window.matchMedia ??= ((query: string) => ({
    matches: false, media: query, addEventListener: () => {}, removeEventListener: () => {},
    addListener: () => {}, removeListener: () => {}, onchange: null, dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
});
afterEach(() => { cleanup(); localStorage.clear(); document.documentElement.className = ''; });

describe('ThemeControl', () => {
  it('empieza en Sistema y aplica Oscuro y Claro a <html>', async () => {
    render(<ThemeProvider><ThemeControl /></ThemeProvider>);
    await waitFor(() => expect(screen.getByRole('radio', { name: 'Sistema' }).getAttribute('aria-checked')).toBe('true'));
    await userEvent.click(screen.getByRole('radio', { name: 'Oscuro' }));
    await waitFor(() => expect(document.documentElement.classList.contains('dark')).toBe(true));
    await userEvent.click(screen.getByRole('radio', { name: 'Claro' }));
    await waitFor(() => expect(document.documentElement.classList.contains('dark')).toBe(false));
    expect(localStorage.getItem('theme')).toBe('light');
  });
});
