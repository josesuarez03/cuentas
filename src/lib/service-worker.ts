export const SW_URL = '/serwist/sw.js';

export function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
  return navigator.serviceWorker.register(SW_URL, { scope: '/' });
}
