// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { NotificationsSection } from './notifications-section';

const mutate = vi.fn();
vi.mock('@/features/settings/hooks/use-settings', () => ({ useUpdatePreferences: () => ({ mutate }) }));
const client = vi.hoisted(() => ({ pushSupport: vi.fn(), currentSubscription: vi.fn(), subscribeThisDevice: vi.fn(), unsubscribeThisDevice: vi.fn() }));
vi.mock('@/features/notifications/client/push-client', () => client);
const actions = vi.hoisted(() => ({ subscribePushAction: vi.fn(), unsubscribePushAction: vi.fn() }));
vi.mock('@/features/notifications/server/actions', () => actions);
vi.mock('@/features/month/server/actions', () => ({ confirmIncomeAction: vi.fn(), updateEntryAmountAction: vi.fn() }));

const prefs = { emailNotifications: true, pushNotifications: false };
const KEY = 'BPUB';
const ui = (p = prefs, key: string | null = KEY) => render(
  <QueryClientProvider client={new QueryClient()}><NotificationsSection preferences={p} vapidPublicKey={key} /></QueryClientProvider>,
);

beforeEach(() => {
  client.pushSupport.mockReturnValue('supported');
  client.currentSubscription.mockResolvedValue(null);
  actions.subscribePushAction.mockResolvedValue({ ok: true });
  actions.unsubscribePushAction.mockResolvedValue({ ok: true });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it('explica qué se avisa y el correo se puede cambiar', async () => {
  ui();
  expect(screen.getByText('Te avisamos el día de cobro de una nómina pendiente y, si sigue pendiente, al día siguiente. El resto de recordatorios está en Inicio.')).toBeTruthy();
  await userEvent.click(screen.getByRole('switch', { name: 'Avisos por correo' }));
  expect(mutate).toHaveBeenCalledWith({ emailNotifications: false });
});

it('sin soporte: push desactivado con la explicación de iPhone', async () => {
  client.pushSupport.mockReturnValue('unsupported');
  ui();
  await waitFor(() => expect((screen.getByRole('switch', { name: 'Avisos push' }) as HTMLButtonElement).disabled).toBe(true));
  expect(screen.getByText('En iPhone, añade Kuadrix a la pantalla de inicio para recibir avisos push (iOS 16.4+).')).toBeTruthy();
});

it('sin clave VAPID: desactivado y lo dice', async () => {
  ui(prefs, null);
  await waitFor(() => expect((screen.getByRole('switch', { name: 'Avisos push' }) as HTMLButtonElement).disabled).toBe(true));
  expect(screen.getByText('Los avisos push no están configurados todavía.')).toBeTruthy();
});

it('activar: pide permiso, suscribe este dispositivo y lo guarda', async () => {
  const sub = { endpoint: 'https://push.example/1', keys: { p256dh: 'p', auth: 'a' } };
  client.subscribeThisDevice.mockResolvedValue(sub);
  ui();
  const push = await screen.findByRole('switch', { name: 'Avisos push' });
  await waitFor(() => expect((push as HTMLButtonElement).disabled).toBe(false));
  await userEvent.click(push);
  expect(client.subscribeThisDevice).toHaveBeenCalledWith(KEY);
  expect(actions.subscribePushAction).toHaveBeenCalledWith(sub);
  await waitFor(() => expect(push.getAttribute('aria-checked')).toBe('true'));
  expect(screen.getByText('Solo en este dispositivo. Actívalo también en los demás donde quieras recibirlos.')).toBeTruthy();
});

it('permiso denegado: lo explica y no guarda nada', async () => {
  client.subscribeThisDevice.mockResolvedValue('denied');
  ui();
  const push = await screen.findByRole('switch', { name: 'Avisos push' });
  await waitFor(() => expect((push as HTMLButtonElement).disabled).toBe(false));
  await userEvent.click(push);
  expect(await screen.findByText('Has bloqueado las notificaciones de Kuadrix en este navegador. Permítelas en los ajustes del navegador y vuelve a intentarlo.')).toBeTruthy();
  expect(actions.subscribePushAction).not.toHaveBeenCalled();
  expect(push.getAttribute('aria-checked')).toBe('false');
});

it('desactivar: da de baja este dispositivo', async () => {
  client.currentSubscription.mockResolvedValue({ endpoint: 'https://push.example/1' });
  client.unsubscribeThisDevice.mockResolvedValue('https://push.example/1');
  ui({ emailNotifications: true, pushNotifications: true });
  const push = await screen.findByRole('switch', { name: 'Avisos push' });
  await waitFor(() => expect(push.getAttribute('aria-checked')).toBe('true'));
  await userEvent.click(push);
  expect(actions.unsubscribePushAction).toHaveBeenCalledWith('https://push.example/1');
  await waitFor(() => expect(push.getAttribute('aria-checked')).toBe('false'));
});
