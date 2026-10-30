import type { Metadata } from 'next';
import { SignedInReturn } from '@/features/auth/components/signed-in-return';

export const dynamic = 'force-static';
export const metadata: Metadata = { title: 'Has entrado · Kuadrix' };

export default function EntrarListoPage() {
  return <SignedInReturn />;
}
