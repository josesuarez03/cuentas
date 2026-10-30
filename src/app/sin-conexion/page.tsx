import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/shared/components/ui/button';

export const dynamic = 'force-static';
export const metadata: Metadata = { title: 'Sin conexión · Kuadrix' };

export default function SinConexionPage() {
  return (
    <main className="flex min-h-dvh flex-col items-start gap-4 bg-paper px-4 pt-16">
      <h1 className="text-[22px] font-semibold text-ink">Sin conexión</h1>
      <p className="text-[15px] text-ink-muted">
        Esta pantalla no está guardada en este dispositivo. Vuelve a intentarlo cuando tengas conexión.
      </p>
      <Button asChild className="min-h-11">
        <Link href="/inicio">Volver a Inicio</Link>
      </Button>
    </main>
  );
}
