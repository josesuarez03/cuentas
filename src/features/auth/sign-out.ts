import type { QueryClient } from '@tanstack/react-query';
import { authClient } from '@/features/auth/auth-client';
import { cachesToDelete } from '@/sw/policy';

// Cierra sesión y borra de este dispositivo los datos guardados para usar sin conexión.
// La caché estática y la precache de Serwist no son datos del usuario y se quedan.
export async function signOutAndClear(queryClient: QueryClient): Promise<{ ok: boolean }> {
  try {
    const { error } = await authClient.signOut();
    if (error) return { ok: false };
  } catch {
    return { ok: false };
  }
  if (typeof caches !== 'undefined') {
    try {
      const names = await caches.keys();
      await Promise.all(cachesToDelete(names).map((name) => caches.delete(name)));
    } catch {
      // Sin Cache Storage utilizable: la sesión ya está cerrada, seguimos.
    }
  }
  queryClient.clear();
  window.location.replace('/login');
  return { ok: true };
}
