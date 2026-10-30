/// <reference lib="webworker" />
import type { PrecacheEntry, SerwistGlobalConfig, SerwistPlugin } from 'serwist';
import { CacheFirst, CacheableResponsePlugin, ExpirationPlugin, NetworkFirst, Serwist } from 'serwist';
import { CACHE, cacheablePage, cachesToDelete, classify, notificationTarget, pushPayload, type CacheKind } from './policy';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}
declare const self: ServiceWorkerGlobalScope;

const is = (kind: CacheKind) => ({ request }: { request: Request }) => classify(request, self.location.origin) === kind;
const onlyOk: SerwistPlugin = { cacheWillUpdate: async ({ response }) => (cacheablePage(response) ? response : null) };

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  precacheOptions: { cleanupOutdatedCaches: true },
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false,
  runtimeCaching: [
    { matcher: is('api-read'), handler: new NetworkFirst({ cacheName: CACHE.api, plugins: [onlyOk, new ExpirationPlugin({ maxEntries: 40, maxAgeSeconds: 30 * 24 * 60 * 60 })] }) },
    { matcher: is('page'), handler: new NetworkFirst({ cacheName: CACHE.pages, networkTimeoutSeconds: 10, plugins: [onlyOk, new ExpirationPlugin({ maxEntries: 20 })] }) },
    { matcher: is('static'), handler: new CacheFirst({ cacheName: CACHE.static, plugins: [new CacheableResponsePlugin({ statuses: [200] }), new ExpirationPlugin({ maxEntries: 200 })] }) },
  ],
  fallbacks: { entries: [{ url: '/sin-conexion', matcher: ({ request }) => request.destination === 'document' }] },
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((names) => Promise.all(cachesToDelete(names).map((n) => caches.delete(n)))));
});

self.addEventListener('push', (event) => {
  const data = pushPayload(event.data ? event.data.text() : null);
  event.waitUntil(self.registration.showNotification(data.title, { body: data.body, tag: data.tag, lang: 'es', data: { url: data.url } }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const href = notificationTarget(event.notification.data?.url, self.location.origin);
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if (new URL(client.url).origin !== self.location.origin) continue;
      await client.focus();
      try { await client.navigate(href); return; } catch { break; }
    }
    await self.clients.openWindow(href);
  })());
});

serwist.addEventListeners();
