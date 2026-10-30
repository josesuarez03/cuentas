// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Catalog } from '@/features/catalog/server/catalog';
import { addPocketExpenseAction } from '@/features/month/server/pocket-actions';
import { AddEntrySheet } from './add-entry-sheet';

vi.mock('@/features/month/server/actions', () => ({ addOneOffEntryAction: vi.fn() }));
vi.mock('@/features/month/server/loan-actions', () => ({ lendMoneyAction: vi.fn() }));
vi.mock('@/features/month/server/pocket-actions', () => ({ addPocketExpenseAction: vi.fn(), spendFromFundAction: vi.fn() }));

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

function renderSheet(catalog: Catalog, props: Partial<ComponentProps<typeof AddEntrySheet>> = {}) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <AddEntrySheet open onOpenChange={vi.fn()} ym="2026-10" catalog={catalog} {...props} />
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

const fullCatalog: Catalog = {
  categories: [{ id: 'c1', name: 'Hogar', kind: 'expense' }],
  accounts: [{ id: 'a1', name: 'Cuenta corriente', type: 'checking' }],
};
const pockets = [
  { id: 'b1', name: 'Ocio', limitCents: 15000, spentCents: 0 },
  { id: 'b2', name: 'Ropa', limitCents: 5000, spentCents: 0 },
];

describe('AddEntrySheet modos', () => {
  it('sin bolsas no ofrece «Gasto de bolsa»', () => {
    renderSheet(fullCatalog);
    expect(screen.queryByRole('radio', { name: 'Gasto de bolsa' })).toBeNull();
    expect(screen.getByRole('radio', { name: 'Préstamo' })).toBeTruthy();
  });

  it('«Préstamo» pide a quién y el botón dice «Prestar»', async () => {
    renderSheet(fullCatalog);
    await userEvent.click(screen.getByRole('radio', { name: 'Préstamo' }));
    expect(screen.getByLabelText('¿A quién?')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Prestar' })).toBeTruthy();
  });

  it('abre en «Gasto de bolsa» con la bolsa elegida', () => {
    renderSheet(fullCatalog, { pockets, initialMode: 'pocket', initialPocketId: 'b2' });
    expect(screen.getByRole('radio', { name: 'Gasto de bolsa' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('combobox', { name: 'Bolsa' }).textContent).toContain('Ropa');
    expect(screen.getByRole('button', { name: 'Apuntar gasto' })).toBeTruthy();
  });

  it('con modo «bolsa» pero sin bolsas muestra el formulario de gasto', () => {
    renderSheet(fullCatalog, { pockets: [], initialMode: 'pocket' });
    expect(screen.queryByText('Aún no tienes bolsas')).toBeNull();
    expect(screen.getByRole('radio', { name: 'Gasto' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('button', { name: 'Añadir' })).toBeTruthy();
  });

  it('rechaza un gasto de bolsa de 0 €', async () => {
    renderSheet(fullCatalog, { pockets, initialMode: 'pocket' });
    await userEvent.type(screen.getByLabelText('Importe (€)'), '0');
    await userEvent.click(screen.getByRole('button', { name: 'Apuntar gasto' }));
    expect(await screen.findByText('Escribe un importe mayor que 0.')).toBeTruthy();
    expect(addPocketExpenseAction).not.toHaveBeenCalled();
  });

  it('«Préstamo» sin cuentas deshabilita Prestar y lo explica', async () => {
    renderSheet({ categories: [], accounts: [] });
    await userEvent.click(screen.getByRole('radio', { name: 'Préstamo' }));
    expect(screen.getByText('Aún no tienes cuentas')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe('Para prestar necesitas al menos una cuenta.');
    expect((screen.getByRole('button', { name: 'Prestar' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
