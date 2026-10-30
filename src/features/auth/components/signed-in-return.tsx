'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/shared/components/ui/button';
import { isInstalledApp, SIGNED_IN } from '@/features/auth/popup-sign-in';

// Tras entrar con Google en la ventana aparte: avisa a la PWA y se cierra.
// iOS no deja cerrar su navegador superpuesto desde la página: entonces pedimos tocar ✕
// (la PWA de debajo entra sola al volver a verse) en vez de cargar la app aquí dentro.
export function SignedInReturn() {
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    try {
      (window.opener as Window | null)?.postMessage({ type: SIGNED_IN }, window.location.origin);
    } catch {
      // La ventana que nos abrió ya no está.
    }
    window.close();
    const fallback = window.setTimeout(() => {
      if (isInstalledApp()) window.location.replace('/');
      else setStuck(true);
    }, 300);
    return () => window.clearTimeout(fallback);
  }, []);

  return (
    <main className="flex min-h-dvh flex-col items-start gap-4 bg-paper px-4 pt-16">
      <p role="status" className="text-[15px] text-ink">
        {stuck ? 'Has entrado. Toca ✕ arriba para volver a Kuadrix.' : 'Has entrado. Volviendo a Kuadrix…'}
      </p>
      <Button asChild variant={stuck ? 'outline' : 'default'} className="min-h-11">
        <Link href="/">{stuck ? 'Seguir aquí' : 'Ir a Kuadrix'}</Link>
      </Button>
    </main>
  );
}
