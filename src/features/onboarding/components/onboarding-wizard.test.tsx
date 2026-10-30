// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { completeOnboardingAction } from '@/features/onboarding/server/actions';
import { SAVE_ERROR } from '@/features/month/save-error';
import { OnboardingWizard } from './onboarding-wizard';

const replace = vi.fn();
vi.mock('@/features/onboarding/server/actions', () => ({ completeOnboardingAction: vi.fn(async () => ({ ok: true })) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));

beforeAll(() => {
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
  window.matchMedia ??= ((query: string) => ({
    matches: false, media: query, addEventListener: () => {}, removeEventListener: () => {},
    addListener: () => {}, removeListener: () => {}, onchange: null, dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('OnboardingWizard', () => {
  it('cuentas → nómina → partidas y envía lo escrito', async () => {
    render(<OnboardingWizard />);
    expect(screen.getByText('Paso 1 de 3')).toBeTruthy();
    await userEvent.type(screen.getByLabelText('Nombre de la cuenta'), 'BBVA principal');
    await userEvent.type(screen.getByLabelText('Saldo de hoy (€)'), '2.300,00');
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));

    expect(screen.getByText('Paso 2 de 3')).toBeTruthy();
    await userEvent.type(screen.getByLabelText('Neto al mes (€)'), '1.870');
    await userEvent.type(screen.getByLabelText('Día de cobro'), '27');
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));

    expect(screen.getByText('Paso 3 de 3')).toBeTruthy();
    await userEvent.type(screen.getByLabelText('Alquiler (€)'), '480');
    await userEvent.click(screen.getByRole('button', { name: 'Empezar' }));

    await waitFor(() => expect(completeOnboardingAction).toHaveBeenCalledWith({
      accounts: [{ name: 'BBVA principal', bank: '', type: 'checking', balanceCents: 230000 }],
      salary: { amountCents: 187000, accountIndex: 0, paydayDay: 27 },
      items: [{ name: 'Alquiler', category: 'Piso', amountCents: 48000, accountIndex: 0 }],
    }));
    expect(replace).toHaveBeenCalledWith('/inicio');
  });

  it('no avanza sin nombre de cuenta y deja saltar la nómina', async () => {
    render(<OnboardingWizard />);
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByRole('alert').textContent).toBe('Escribe un nombre, por ejemplo «BBVA».');
    await userEvent.type(screen.getByLabelText('Nombre de la cuenta'), 'BBVA');
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    await userEvent.click(screen.getByRole('button', { name: 'Saltar' }));
    expect(screen.getByText('Paso 3 de 3')).toBeTruthy();
  });

  async function pick(label: string, option: string) {
    await userEvent.click(screen.getByRole('combobox', { name: label }));
    await userEvent.click(await screen.findByRole('option', { name: option }));
  }

  it('al quitar una cuenta reasigna los índices de nómina y partidas', async () => {
    render(<OnboardingWizard />);
    for (const name of ['A', 'B', 'C']) {
      const names = screen.getAllByLabelText('Nombre de la cuenta');
      await userEvent.type(names[names.length - 1], name);
      if (name !== 'C') await userEvent.click(screen.getByRole('button', { name: 'Añadir otra cuenta' }));
    }
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    await userEvent.type(screen.getByLabelText('Neto al mes (€)'), '1000');
    await userEvent.type(screen.getByLabelText('Día de cobro'), '5');
    await pick('Cuenta', 'C');
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    await userEvent.type(screen.getByLabelText('Alquiler (€)'), '480');
    await pick('Cuenta de alquiler', 'B');
    await userEvent.click(screen.getByRole('button', { name: 'Atrás' }));
    await userEvent.click(screen.getByRole('button', { name: 'Atrás' }));
    await userEvent.click(screen.getAllByRole('button', { name: 'Quitar cuenta' })[0]);
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    await userEvent.click(screen.getByRole('button', { name: 'Empezar' }));
    await waitFor(() => expect(completeOnboardingAction).toHaveBeenCalled());
    const input = vi.mocked(completeOnboardingAction).mock.calls[0][0];
    expect(input.accounts.map((a) => a.name)).toEqual(['B', 'C']);
    expect(input.salary?.accountIndex).toBe(1);
    expect(input.items[0].accountIndex).toBe(0);
  });

  it('al quitar la cuenta elegida vuelve a la primera', async () => {
    render(<OnboardingWizard />);
    await userEvent.type(screen.getByLabelText('Nombre de la cuenta'), 'A');
    await userEvent.click(screen.getByRole('button', { name: 'Añadir otra cuenta' }));
    await userEvent.type(screen.getAllByLabelText('Nombre de la cuenta')[1], 'B');
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    await userEvent.type(screen.getByLabelText('Neto al mes (€)'), '1000');
    await userEvent.type(screen.getByLabelText('Día de cobro'), '5');
    await pick('Cuenta', 'B');
    await userEvent.click(screen.getByRole('button', { name: 'Atrás' }));
    await userEvent.click(screen.getAllByRole('button', { name: 'Quitar cuenta' })[1]);
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    await userEvent.click(screen.getByRole('button', { name: 'Empezar' }));
    await waitFor(() => expect(completeOnboardingAction).toHaveBeenCalled());
    expect(vi.mocked(completeOnboardingAction).mock.calls[0][0].salary?.accountIndex).toBe(0);
  });

  it('muestra el error del servidor y no navega', async () => {
    vi.mocked(completeOnboardingAction).mockResolvedValueOnce({ ok: false, error: 'No se ha guardado.' });
    render(<OnboardingWizard />);
    await userEvent.type(screen.getByLabelText('Nombre de la cuenta'), 'BBVA');
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    await userEvent.click(screen.getByRole('button', { name: 'Saltar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Empezar' }));
    expect((await screen.findByRole('alert')).textContent).toBe('No se ha guardado.');
    expect(replace).not.toHaveBeenCalled();
  });

  it.each(['0', '32'])('rechaza el día de cobro %s', async (day) => {
    render(<OnboardingWizard />);
    await userEvent.type(screen.getByLabelText('Nombre de la cuenta'), 'BBVA');
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    await userEvent.type(screen.getByLabelText('Neto al mes (€)'), '1000');
    await userEvent.type(screen.getByLabelText('Día de cobro'), day);
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByText('Paso 2 de 3')).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toBe('Escribe un día entre 1 y 31.');
  });

  it('si la acción lanza, muestra el error de guardado y rehabilita el botón', async () => {
    vi.mocked(completeOnboardingAction).mockRejectedValueOnce(new Error('boom'));
    render(<OnboardingWizard />);
    await userEvent.type(screen.getByLabelText('Nombre de la cuenta'), 'BBVA');
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    await userEvent.click(screen.getByRole('button', { name: 'Saltar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Empezar' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(SAVE_ERROR));
    expect((screen.getByRole('button', { name: 'Empezar' }) as HTMLButtonElement).disabled).toBe(false);
    expect(replace).not.toHaveBeenCalled();
  });

  it('rechaza un saldo negativo', async () => {
    render(<OnboardingWizard />);
    await userEvent.type(screen.getByLabelText('Nombre de la cuenta'), 'BBVA');
    await userEvent.type(screen.getByLabelText('Saldo de hoy (€)'), '-5');
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByText('Paso 1 de 3')).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toBe('Escribe un importe, por ejemplo 2.300,00.');
  });

  it('la tarjeta de crédito pide «Lo que debes (€)»', async () => {
    render(<OnboardingWizard />);
    await pick('Tipo', 'Tarjeta de crédito');
    expect(screen.getByLabelText('Lo que debes (€)')).toBeTruthy();
    expect(screen.queryByLabelText('Saldo de hoy (€)')).toBeNull();
  });

  it('mueve el foco al título del paso', async () => {
    render(<OnboardingWizard />);
    await userEvent.type(screen.getByLabelText('Nombre de la cuenta'), 'BBVA');
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 2, name: 'Tu nómina' }));
  });
});
