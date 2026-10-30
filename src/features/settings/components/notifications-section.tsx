'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { runAction, SaveError } from '@/features/month/hooks/use-month';
import { SAVE_ERROR } from '@/features/month/save-error';
import {
  currentSubscription,
  pushSupport,
  subscribeThisDevice,
  unsubscribeThisDevice,
} from '@/features/notifications/client/push-client';
import { subscribePushAction, unsubscribePushAction } from '@/features/notifications/server/actions';
import { settingsKey } from '@/features/settings/domain/types';
import type { Preferences } from '@/features/settings/domain/types';
import { useUpdatePreferences } from '@/features/settings/hooks/use-settings';
import { Label } from '@/shared/components/ui/label';
import { Switch } from '@/shared/components/ui/switch';
import { SettingsSection } from './settings-section';

type Support = 'unknown' | 'supported' | 'unsupported';

export function NotificationsSection({
  preferences,
  vapidPublicKey,
}: {
  preferences: Preferences;
  vapidPublicKey: string | null;
}) {
  const { mutate } = useUpdatePreferences();
  const qc = useQueryClient();
  const [support, setSupport] = useState<Support>('unknown');
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [denied, setDenied] = useState<'blocked' | 'dismissed' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    const s = pushSupport();
    setSupport(s);
    if (s === 'supported') {
      currentSubscription().then((sub) => setSubscribed(sub !== null)).catch(() => setSubscribed(false));
    }
  }, []);

  async function togglePush(on: boolean) {
    if (!vapidPublicKey || busyRef.current) return;
    busyRef.current = true;
    setDenied(null);
    setError(null);
    let browserSubscribed = false;
    try {
      if (on) {
        const r = await subscribeThisDevice(vapidPublicKey);
        if (r === 'denied') {
          setDenied(typeof Notification !== 'undefined' && Notification.permission === 'default' ? 'dismissed' : 'blocked');
          return;
        }
        browserSubscribed = true;
        await runAction(() => subscribePushAction(r));
        setSubscribed(true);
      } else {
        const endpoint = await unsubscribeThisDevice();
        await runAction(() => unsubscribePushAction(endpoint));
        setSubscribed(false);
      }
      await qc.invalidateQueries({ queryKey: settingsKey });
    } catch (e) {
      const message = e instanceof SaveError ? e.message : SAVE_ERROR;
      toast.error(message);
      setError(message);
      if (browserSubscribed) await unsubscribeThisDevice().catch(() => null);
      try {
        setSubscribed((await currentSubscription()) !== null);
      } catch {
        setSubscribed(false);
      }
    } finally {
      busyRef.current = false;
    }
  }

  const note =
    support === 'unsupported'
      ? 'En iPhone, los avisos push llegarán cuando Kuadrix se pueda instalar en la pantalla de inicio. Mientras tanto, te avisamos por correo.'
      : !vapidPublicKey
        ? 'Los avisos push no están configurados todavía.'
        : error
          ? error
          : denied === 'dismissed'
          ? 'No se han activado los avisos. Vuelve a intentarlo cuando quieras.'
          : denied === 'blocked'
          ? 'Has bloqueado las notificaciones de Kuadrix en este navegador. Permítelas en los ajustes del navegador y vuelve a intentarlo.'
          : 'Solo en este dispositivo. Actívalo también en los demás donde quieras recibirlos.';

  return (
    <SettingsSection
      id="ajustes-avisos"
      title="Avisos"
      description="Te avisamos el día de cobro de una nómina pendiente y, si sigue pendiente, al día siguiente. El resto de recordatorios está en Inicio."
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
              checked={subscribed === true}
              aria-describedby="pref-push-note"
              disabled={support !== 'supported' || !vapidPublicKey || subscribed === null}
              onCheckedChange={(v) => void togglePush(v)}
            />
          </Label>
          <p id="pref-push-note" aria-live="polite" className="pb-3 text-[13px] text-ink-muted">
            {note}
          </p>
        </div>
      </div>
    </SettingsSection>
  );
}
