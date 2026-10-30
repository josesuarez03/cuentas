// Service worker mínimo para Web Push (plan 3). El plan 4 lo sustituye por Serwist y copia estos manejadores.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data ? event.data.text() : '' }; }
  event.waitUntil(self.registration.showNotification(data.title || 'Kuadrix', {
    body: data.body || '',
    tag: data.tag,
    lang: 'es',
    data: { url: data.url || '/inicio' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  let url = new URL(event.notification.data?.url || '/inicio', self.location.origin);
  // Nunca navegar a otro origen: se abre la misma ruta en el origen propio del service worker.
  if (url.origin !== self.location.origin) url = new URL(url.pathname + url.search, self.location.origin);
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if (new URL(client.url).origin !== url.origin) continue;
      await client.focus();
      try { await client.navigate(url.href); return; } catch { break; }
    }
    await self.clients.openWindow(url.href);
  })());
});
