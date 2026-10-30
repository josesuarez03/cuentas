// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { SettingsRecurring, SettingsView } from '@/features/settings/domain/types';
import { RecurringSection } from './recurring-section';

vi.mock('@/features/settings/server/templates-actions', () => ({
  createRecurringAction: vi.fn(), updateRecurringAction: vi.fn(), setRecurringActiveAction: vi.fn(),
}));
vi.mock('@/features/settings/server/general-actions', () => ({ updatePreferencesAction: vi.fn() }));
vi.mock('@/features/month/server/actions', () => ({ confirmIncomeAction: vi.fn(), updateEntryAmountAction: vi.fn() }));

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

const base: SettingsRecurring = {
  id: 'r1', name: 'Luz', kind: 'expense', categoryId: 'c1', categoryLabel: 'Piso › Luz',
  accountId: 'a1', accountName: 'BBVA principal', amountCents: 6000, frequency: 'monthly', startMonth: '2026-01',
  anchorMonth: null, installmentsTotal: null, paydayDay: null, paydayRule: 'before', active: true,
  currentInstallment: null, remainingInstallments: null,
};
const recurring: SettingsRecurring[] = [
  { ...base, id: 'r1', name: 'Nómina', kind: 'income', amountCents: 187000 },
  { ...base, id: 'r2', name: 'Luz' },
  { ...base, id: 'r3', name: 'agua' },
  { ...base, id: 'r4', name: 'Ágata' },
];
const settings: SettingsView = {
  accounts: [{ id: 'a1', name: 'BBVA principal', bank: 'BBVA', type: 'checking', defaultSavingsPercent: 0 }],
  categories: [{ id: 'c1', name: 'Luz', kind: 'expense', parentId: null }],
  recurring, pockets: [], funds: [], preferences: { emailNotifications: true, pushNotifications: false },
};

function ui() {
  return render(<QueryClientProvider client={new QueryClient()}><RecurringSection settings={settings} /></QueryClientProvider>);
}
const names = () => screen.getAllByRole('listitem').map((li) => within(li).getAllByText(/./)[0]!.textContent);

describe('RecurringSection', () => {
  it('lista las partidas por nombre, sin distinguir acentos ni mayúsculas', () => {
    ui();
    expect(names()).toEqual(['Ágata', 'agua', 'Luz', 'Nómina']);
  });

  it('busca por nombre sin distinguir acentos ni mayúsculas', async () => {
    ui();
    const search = screen.getByRole('searchbox', { name: 'Buscar partida' });
    expect(search.getAttribute('placeholder')).toBe('Buscar…');
    await userEvent.type(search, 'NOMINA');
    expect(names()).toEqual(['Nómina']);
    await userEvent.clear(search);
    await userEvent.type(search, 'ag');
    expect(names()).toEqual(['Ágata', 'agua']);
  });

  it('sin coincidencias lo dice, y Escape vacía la búsqueda', async () => {
    ui();
    const search = screen.getByRole('searchbox', { name: 'Buscar partida' });
    await userEvent.type(search, 'gimnasio');
    expect(screen.getByText('Ninguna partida coincide con «gimnasio».')).toBeTruthy();
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
    await userEvent.keyboard('{Escape}');
    expect((search as HTMLInputElement).value).toBe('');
    expect(names()).toEqual(['Ágata', 'agua', 'Luz', 'Nómina']);
  });
});

describe('RecurringFormDialog', () => {
  it('el cuerpo del formulario hace scroll y «Guardar» queda fuera, siempre visible', async () => {
    ui();
    await userEvent.click(screen.getByRole('button', { name: 'Editar Luz' }));
    const dialog = screen.getByRole('dialog', { name: 'Editar partida' });
    const body = within(dialog).getByTestId('recurring-form-body');
    expect(body.className).toContain('overflow-y-auto');
    expect(body.className).toContain('overscroll-contain');
    const save = within(dialog).getByRole('button', { name: 'Guardar' });
    expect(body.contains(save)).toBe(false);
    expect(within(body).getByText('Tipo')).toBeTruthy();
    const month = within(body).getByLabelText('Empieza en');
    expect(month.getAttribute('type')).toBe('month');
    expect(month.className).toContain('appearance-none');
  });
});
