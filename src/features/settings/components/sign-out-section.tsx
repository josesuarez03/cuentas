'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { signOutAndClear } from '@/features/auth/sign-out';
import { Button } from '@/shared/components/ui/button';
import { useOnline } from '@/shared/hooks/use-online';
import { SettingsSection } from './settings-section';

export function SignOutSection() {
  const queryClient = useQueryClient();
  const online = useOnline();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    setBusy(true);
    const { ok } = await signOutAndClear(queryClient);
    if (!ok) {
      toast.error('No se ha podido cerrar sesión. Inténtalo de nuevo.');
      setBusy(false);
    }
  }

  return (
    <SettingsSection
      id="ajustes-sesion"
      title="Sesión"
      description="Se borran de este dispositivo los datos guardados para usar sin conexión."
    >
      <div className="py-3">
        <Button variant="outline" className="min-h-11 w-full" disabled={!online || busy} onClick={() => void onClick()}>
          Cerrar sesión
        </Button>
      </div>
    </SettingsSection>
  );
}
