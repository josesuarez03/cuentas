'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/shared/components/ui/button';
import { SIGNED_IN } from '@/features/auth/popup-sign-in';

// Tras entrar con Google en la ventana aparte: avisa a la PWA, se cierra y,
// si el navegador no deja cerrarla, sigue a Kuadrix aquí mismo.
export function SignedInReturn() {
  useEffect(() => {
    try {
      (window.opener as Window | null)?.postMessage({ type: SIGNED_IN }, window.location.origin);
    } catch {
      // La ventana que nos abrió ya no está.
    }
    window.close();
    const fallback = window.setTimeout(() => window.location.replace('/'), 300);
    return () => window.clearTimeout(fallback);
  }, []);

  return (
    <main className="flex min-h-dvh flex-col items-start gap-4 bg-paper px-4 pt-16">
      <p role="status" className="text-[15px] text-ink">Has entrado. Volviendo a Kuadrix…</p>
      <Button asChild className="min-h-11">
        <Link href="/">Ir a Kuadrix</Link>
      </Button>
    </main>
  );
}
