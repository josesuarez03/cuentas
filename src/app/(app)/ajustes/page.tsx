import type { Metadata } from 'next';
import Link from 'next/link';
import { EmptyState } from '@/shared/components/empty-state';
import { Button } from '@/shared/components/ui/button';

export const metadata: Metadata = { title: 'Ajustes · Kuadrix' };

export default function AjustesPage() {
  return (
    <main className="mx-auto w-full max-w-xl px-4 pt-5 md:max-w-2xl md:px-6 md:pt-8">
      <EmptyState
        as="h1"
        title="Ajustes"
        action={<Button asChild variant="outline" className="min-h-11 text-[15px]"><Link href="/mes">Ir al mes</Link></Button>}
      >
        Aquí podrás cambiar tus recurrentes, cuentas, categorías, bolsas y huchas, y el reparto del ahorro. Aún no está disponible; mientras, tu mes sigue en Mes.
      </EmptyState>
    </main>
  );
}
