// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Catalog } from '@/features/catalog/server/catalog';
import { AddEntrySheet } from './add-entry-sheet';

vi.mock('@/features/month/server/actions', () => ({ addOneOffEntryAction: vi.fn() }));

beforeAll(() => {
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    onchange: null,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
});

afterEach(cleanup);

function renderSheet(catalog: Catalog) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <AddEntrySheet open onOpenChange={vi.fn()} ym="2026-10" catalog={catalog} />
    </QueryClientProvider>,
  );
}

describe('AddEntrySheet con catálogo', () => {
  it('sin categorías ni cuentas lo explica y deshabilita Añadir', () => {
    renderSheet({ categories: [], accounts: [] });
    expect(screen.getByText('Aún no tienes cuentas')).toBeTruthy();
    expect(screen.getByText('Aún no tienes categorías de gasto')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe('Para añadir partidas necesitas al menos una categoría y una cuenta.');
    expect((screen.getByRole('button', { name: 'Añadir' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('con una categoría de gasto y una cuenta no muestra el aviso', () => {
    renderSheet({
      categories: [{ id: 'c1', name: 'Hogar', kind: 'expense' }],
      accounts: [{ id: 'a1', name: 'Cuenta corriente', type: 'checking' }],
    });
    expect(screen.queryByText(/Aún no tienes/)).toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
    expect((screen.getByRole('button', { name: 'Añadir' }) as HTMLButtonElement).disabled).toBe(false);
  });
});
