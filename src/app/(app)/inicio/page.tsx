import type { Metadata } from 'next';
import { HomeScreen } from '@/features/home/components/home-screen';

export const metadata: Metadata = { title: 'Inicio · Kuadrix' };

export default function InicioPage() {
  return <HomeScreen />;
}
