import type { Metadata } from 'next';
import { WealthScreen } from '@/features/wealth/components/wealth-screen';

export const metadata: Metadata = { title: 'Patrimonio · Kuadrix' };

export default function PatrimonioPage() {
  return <WealthScreen />;
}
