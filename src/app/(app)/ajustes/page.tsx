import type { Metadata } from 'next';
import { SettingsScreen } from '@/features/settings/components/settings-screen';

export const metadata: Metadata = { title: 'Ajustes · Kuadrix' };

export default function AjustesPage() {
  return <SettingsScreen />;
}
