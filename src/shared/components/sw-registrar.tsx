'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { registerServiceWorker } from '@/lib/service-worker';

function cacheCurrentScreen() {
  if (navigator.onLine === false) return;
  navigator.serviceWorker?.controller?.postMessage({
    type: 'CACHE_URLS',
    payload: { urlsToCache: [location.pathname + location.search] },
  });
}

export function ServiceWorkerRegistrar() {
  const pathname = usePathname();

  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      void registerServiceWorker().catch(() => undefined);
    }
  }, []);

  // Primera visita o activación tras un despliegue: el SW nuevo aún no ha visto esta pantalla.
  useEffect(() => {
    const sw = navigator.serviceWorker;
    if (!sw?.addEventListener) return;
    sw.addEventListener('controllerchange', cacheCurrentScreen);
    return () => sw.removeEventListener('controllerchange', cacheCurrentScreen);
  }, []);

  useEffect(() => {
    cacheCurrentScreen();
  }, [pathname]);

  return null;
}
