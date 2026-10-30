'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { updatePreferencesAction } from '@/features/settings/server/general-actions';
import type { ActionResult } from '@/features/month/server/action-result';
import { runAction, SaveError } from '@/features/month/hooks/use-month';
import { SAVE_ERROR } from '@/features/month/save-error';
import { settingsKey, type Preferences, type SettingsView } from '@/features/settings/domain/types';
import { wealthKey } from '@/features/wealth/domain/types';

async function fetchSettings(): Promise<SettingsView> {
  let res: Response;
  try {
    res = await fetch('/api/settings');
    if (res.ok) return (await res.json()) as SettingsView;
  } catch {
    throw new Error('No se han podido cargar los ajustes. Revisa la conexión.');
  }
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  throw new Error(body.error ?? 'No se han podido cargar los ajustes.');
}

export function useSettings() {
  return useQuery({ queryKey: settingsKey, queryFn: fetchSettings });
}

/** Ejecuta una acción de Ajustes; si va bien, refresca ajustes, meses y patrimonio. */
export function useSettingsAction<V>(action: (v: V) => Promise<ActionResult>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: V) => runAction(() => action(v)),
    onSuccess: () => Promise.all([
      qc.invalidateQueries({ queryKey: settingsKey }),
      qc.invalidateQueries({ queryKey: ['month'] }),
      qc.invalidateQueries({ queryKey: wealthKey }),
    ]),
  });
}

export function useUpdatePreferences() {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: (patch: Partial<Preferences>) => runAction(() => updatePreferencesAction(patch)),
    onMutate: async (patch: Partial<Preferences>) => {
      await qc.cancelQueries({ queryKey: settingsKey });
      const previous = qc.getQueryData<SettingsView>(settingsKey);
      if (previous) qc.setQueryData<SettingsView>(settingsKey, { ...previous, preferences: { ...previous.preferences, ...patch } });
      return { previous };
    },
    onError: (error, patch, context) => {
      if (context?.previous) qc.setQueryData(settingsKey, context.previous);
      toast.error(error instanceof SaveError ? error.message : SAVE_ERROR, {
        action: { label: 'Reintentar', onClick: () => mutation.mutate(patch) },
      });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: settingsKey }),
  });
  return mutation;
}
