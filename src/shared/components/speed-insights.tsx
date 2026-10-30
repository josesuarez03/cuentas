'use client';

import { SpeedInsights } from '@vercel/speed-insights/next';

// Los enlaces de confirmar llevan `?confirmar=<id>`: la query y el fragmento no salen del dispositivo.
export function withoutQuery<T extends { url: string }>(event: T): T {
  return { ...event, url: event.url.split('#')[0].split('?')[0] };
}

export function KuadrixSpeedInsights() {
  return <SpeedInsights beforeSend={withoutQuery} />;
}
