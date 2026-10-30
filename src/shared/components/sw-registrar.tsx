'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { registerServiceWorker } from '@/lib/service-worker';

export function ServiceWorkerRegistrar() {
  const pathname = usePathname();

  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      void registerServiceWorker().catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    if (navigator.onLine === false) return;
    navigator.serviceWorker?.controller?.postMessage({
      type: 'CACHE_URLS',
      payload: { urlsToCache: [location.pathname + location.search] },
    });
  }, [pathname]);

  return null;
}
