// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { completeOnboardingAction } from '@/features/onboarding/server/actions';
import { OnboardingWizard } from './onboarding-wizard';

const replace = vi.fn();
vi.mock('@/features/onboarding/server/actions', () => ({ completeOnboardingAction: vi.fn(async () => ({ ok: true })) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));

beforeAll(() => {
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
});
