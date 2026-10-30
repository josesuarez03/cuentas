// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { NotificationsSection } from './notifications-section';

const mutate = vi.fn();
vi.mock('@/features/settings/hooks/use-settings', () => ({ useUpdatePreferences: () => ({ mutate }) }));

afterEach(() => { cleanup(); mutate.mockReset(); delete (window as { PushManager?: unknown }).PushManager; });

it('correo se puede cambiar; push sin soporte queda desactivado con la explicación de iPhone', async () => {
  render(<NotificationsSection preferences={{ emailNotifications: true, pushNotifications: false }} />);
  expect(screen.getByText('Los avisos se activarán cuando lleguen los recordatorios automáticos.')).toBeTruthy();
  await userEvent.click(screen.getByRole('switch', { name: 'Avisos por correo' }));
  expect(mutate).toHaveBeenCalledWith({ emailNotifications: false });
  const push = screen.getByRole('switch', { name: 'Avisos push' }) as HTMLButtonElement;
  expect(push.disabled).toBe(true);
  expect(screen.getByText('En iPhone, añade Kuadrix a la pantalla de inicio para recibir avisos push (iOS 16.4+).')).toBeTruthy();
});

it('con soporte, push se puede cambiar y no pide permiso', async () => {
  (window as { PushManager?: unknown }).PushManager = function PushManager() {};
  Object.defineProperty(navigator, 'serviceWorker', { value: {}, configurable: true });
  const requestPermission = vi.fn();
  (window as { Notification?: unknown }).Notification = { requestPermission };
  render(<NotificationsSection preferences={{ emailNotifications: true, pushNotifications: false }} />);
  const push = await screen.findByRole('switch', { name: 'Avisos push' });
  await waitFor(() => expect((push as HTMLButtonElement).disabled).toBe(false));
  await userEvent.click(push);
  expect(mutate).toHaveBeenCalledWith({ pushNotifications: true });
  expect(requestPermission).not.toHaveBeenCalled();
});
