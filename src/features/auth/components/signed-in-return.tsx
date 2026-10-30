'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/shared/components/ui/button';
import { linkHandoff } from '@/features/auth/pwa-handoff';

const COPY = {
  linking: 'Has entrado. Un momento…',
  done: 'Has entrado. Toca ✕ arriba para volver a Kuadrix.',
  failed: 'No se ha podido volver a la app. Cierra esta ventana y vuelve a entrar.',
} as const;

// Vuelta de Google en el navegador superpuesto de iPhone (no comparte cookies con la PWA):
// vincula esta sesión al código de la PWA (?h=…) para que la PWA la recoja, y pide tocar ✕
// en vez de cargar la app aquí dentro.
export function SignedInReturn() {
  const [state, setState] = useState<keyof typeof COPY>('linking');
  useEffect(() => {
    const h = new URLSearchParams(window.location.search).get('h');
    if (!h) {
      setState('done');
      return;
    }
    let alive = true;
    void linkHandoff(h).then((ok) => { if (alive) setState(ok ? 'done' : 'failed'); });
    return () => { alive = false; };
  }, []);

  return (
    <main className="flex min-h-dvh flex-col items-start gap-4 bg-paper px-4 pt-16">
      <p role="status" className={state === 'failed' ? 'text-[15px] text-alerta' : 'text-[15px] text-ink'}>{COPY[state]}</p>
      <Button asChild variant="outline" className="min-h-11">
        <Link href="/">Seguir aquí</Link>
      </Button>
    </main>
  );
}
