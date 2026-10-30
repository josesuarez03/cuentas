'use client';

import { useEffect, useState } from 'react';
import { useUpdatePreferences } from '@/features/settings/hooks/use-settings';
import type { Preferences } from '@/features/settings/domain/types';
import { Label } from '@/shared/components/ui/label';
import { Switch } from '@/shared/components/ui/switch';
import { SettingsSection } from './settings-section';

export function NotificationsSection({ preferences }: { preferences: Preferences }) {
  const { mutate } = useUpdatePreferences();
  const [pushSupported, setPushSupported] = useState(false);
  useEffect(() => {
    setPushSupported('PushManager' in window && 'serviceWorker' in navigator);
  }, []);

  return (
    <SettingsSection
      id="ajustes-avisos"
      title="Avisos"
      description="Los avisos se activarán cuando lleguen los recordatorios automáticos."
    >
      <div className="divide-y divide-line">
        <Label htmlFor="pref-email" className="flex min-h-11 items-center justify-between gap-3 text-[15px] font-normal">
          Avisos por correo
          <Switch
            id="pref-email"
            checked={preferences.emailNotifications}
            onCheckedChange={(v) => mutate({ emailNotifications: v })}
          />
        </Label>
        <div>
          <Label htmlFor="pref-push" className="flex min-h-11 items-center justify-between gap-3 text-[15px] font-normal">
            Avisos push
            <Switch
              id="pref-push"
              checked={preferences.pushNotifications}
              disabled={!pushSupported}
              onCheckedChange={(v) => mutate({ pushNotifications: v })}
            />
          </Label>
          {!pushSupported && (
            <p className="pb-3 text-[13px] text-ink-muted">
              En iPhone, añade Kuadrix a la pantalla de inicio para recibir avisos push (iOS 16.4+).
            </p>
          )}
        </div>
      </div>
    </SettingsSection>
  );
}
