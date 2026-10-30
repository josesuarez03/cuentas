'use client';

import { useOnline } from '@/shared/hooks/use-online';

export function OfflineBanner() {
  const online = useOnline();
  return (
    <div role="status" aria-live="polite" className="sticky top-0 z-30">
      {!online && (
        <p className="border-b border-line bg-aviso-soft px-4 py-2 text-[13px] leading-[18px] text-ink">
          <strong className="font-semibold text-aviso">Sin conexión</strong> · Ves los últimos datos guardados en este dispositivo. Para cambiar algo, vuelve a conectarte.
        </p>
      )}
    </div>
  );
}
