import { safeNext } from '@/features/auth/safe-next';

// Entrar con Google desde la PWA instalada en iPhone: Google se abre en el navegador
// superpuesto de iOS, que no comparte cookies con la PWA. La PWA crea un código secreto,
// el navegador superpuesto lo vincula a su sesión al volver (/entrar/listo?h=…) y la PWA
// lo canjea por su propia cookie (ver /api/entrar/*).

export const ERROR_CALLBACK_URL = '/login?error=acceso';
export const HANDOFF_WINDOW_MS = 5 * 60 * 1000;
const KEY = 'kuadrix:entrar';
const CODE = /^[A-Za-z0-9_-]{43}$/;

export type PendingHandoff = { h: string; next: string; startedAt: number };

let memory: PendingHandoff | null = null;

export function isInstalledApp(): boolean {
  const standalone = typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches;
  return standalone || (navigator as { standalone?: boolean }).standalone === true;
}

/** 32 bytes aleatorios en base64url sin relleno (43 caracteres). */
export function newHandoffCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function handoffCallbackURL(h: string): string {
  return `/entrar/listo?h=${h}`;
}

export function savePendingHandoff(pending: PendingHandoff): void {
  memory = pending;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(pending));
  } catch {
    // Sin sessionStorage: queda en memoria mientras la app siga abierta.
  }
}

export function clearPendingHandoff(): void {
  memory = null;
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Nada que borrar.
  }
}

function stored(): unknown {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** El código pendiente de canjear, si lo hay y no ha caducado. */
export function pendingHandoff(now = Date.now()): PendingHandoff | null {
  const value = (memory ?? stored()) as Partial<PendingHandoff> | null;
  if (!value || typeof value.h !== 'string' || !CODE.test(value.h) || typeof value.startedAt !== 'number') return null;
  if (now - value.startedAt >= HANDOFF_WINDOW_MS) {
    clearPendingHandoff();
    return null;
  }
  return { h: value.h, next: safeNext(value.next), startedAt: value.startedAt };
}

async function post(url: string, h: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: 'POST', credentials: 'same-origin', cache: 'no-store', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ h }),
    });
    return res.status === 204;
  } catch {
    return false;
  }
}

/** Desde la PWA: canjea el código por la cookie de sesión. */
export function claimHandoff(h: string): Promise<boolean> {
  return post('/api/entrar/recoger', h);
}

/** Desde el navegador donde se ha entrado: deja la sesión lista para la PWA. */
export function linkHandoff(h: string): Promise<boolean> {
  return post('/api/entrar/vincular', h);
}
