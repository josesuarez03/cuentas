// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ServiceWorkerRegistrar } from './sw-registrar';

vi.mock('next/navigation', () => ({ usePathname: () => '/mes' }));
afterEach(() => { cleanup(); vi.unstubAllEnvs(); Reflect.deleteProperty(navigator, 'serviceWorker'); });

function fakeSw(controller: { postMessage: ReturnType<typeof vi.fn> } | null) {
  const register = vi.fn().mockResolvedValue({});
  const sw = Object.assign(new EventTarget(), { register, controller });
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: sw });
  return register;
}

function swContainer() {
  return navigator.serviceWorker as unknown as EventTarget & { controller: { postMessage: ReturnType<typeof vi.fn> } | null };
}

it('en producción registra /serwist/sw.js con ámbito /', () => {
  vi.stubEnv('NODE_ENV', 'production');
  const register = fakeSw(null);
  render(<ServiceWorkerRegistrar />);
  expect(register).toHaveBeenCalledTimes(1);
  expect(register).toHaveBeenCalledWith('/serwist/sw.js', { scope: '/' });
});

it('fuera de producción no registra nada', () => {
  const register = fakeSw(null);
  render(<ServiceWorkerRegistrar />);
  expect(register).not.toHaveBeenCalled();
});

it('pide al service worker guardar la pantalla visitada', () => {
  const controller = { postMessage: vi.fn() };
  fakeSw(controller);
  render(<ServiceWorkerRegistrar />);
  expect(controller.postMessage).toHaveBeenCalledWith({ type: 'CACHE_URLS', payload: { urlsToCache: [window.location.pathname + window.location.search] } });
});

it('al tomar el control un service worker nuevo, le pide guardar la pantalla actual', () => {
  fakeSw(null);
  render(<ServiceWorkerRegistrar />);
  const controller = { postMessage: vi.fn() };
  swContainer().controller = controller;
  swContainer().dispatchEvent(new Event('controllerchange'));
  expect(controller.postMessage).toHaveBeenCalledTimes(1);
  expect(controller.postMessage).toHaveBeenCalledWith({ type: 'CACHE_URLS', payload: { urlsToCache: [window.location.pathname + window.location.search] } });
});

it('al desmontarse deja de escuchar controllerchange', () => {
  fakeSw(null);
  const { unmount } = render(<ServiceWorkerRegistrar />);
  unmount();
  const controller = { postMessage: vi.fn() };
  swContainer().controller = controller;
  swContainer().dispatchEvent(new Event('controllerchange'));
  expect(controller.postMessage).not.toHaveBeenCalled();
});
