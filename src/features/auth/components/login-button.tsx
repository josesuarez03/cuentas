'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { authClient } from '@/features/auth/auth-client';
import {
  ERROR_CALLBACK_URL, claimHandoff, clearPendingHandoff, handoffCallbackURL, isInstalledApp, newHandoffCode, pendingHandoff, savePendingHandoff,
} from '@/features/auth/pwa-handoff';

const POLL_MS = 2000;

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" className="size-5">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

export function LoginButton({ callbackURL }: { callbackURL: string }) {
  const [loading, setLoading] = useState(false);
  const checking = useRef(false);
  const claiming = useRef(false);
  const poll = useRef<number | undefined>(undefined);

  // PWA de iPhone: canjea el código que el navegador de Google vinculó a su sesión.
  const claim = useCallback(async (): Promise<boolean> => {
    const pending = pendingHandoff();
    if (!pending || claiming.current) return false;
    claiming.current = true;
    try {
      if (!(await claimHandoff(pending.h))) return false;
      clearPendingHandoff();
      window.clearInterval(poll.current);
      window.location.replace(pending.next);
      return true;
    } finally {
      claiming.current = false;
    }
  }, []);

  const stopPolling = useCallback(() => {
    window.clearInterval(poll.current);
    poll.current = undefined;
  }, []);

  // Al volver a ver /login (cerrado el navegador de Google), si ya hay sesión, entramos.
  useEffect(() => {
    async function check() {
      if (checking.current) return;
      checking.current = true;
      try {
        if (pendingHandoff() && (await claim())) return;
        const { data } = await authClient.getSession();
        if (data?.session) {
          window.location.replace('/');
          return;
        }
      } catch {
        // Sin red: seguimos en /login.
      } finally {
        checking.current = false;
      }
      setLoading(false);
    }
    const onVisibility = () => { if (document.visibilityState === 'visible') void check(); };
    const onPageShow = (e: PageTransitionEvent) => { if (e.persisted) void check(); };
    const onFocus = () => void check();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pageshow', onPageShow);
    window.addEventListener('focus', onFocus);
    // La app se reabrió con un código pendiente: un intento.
    void claim();
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener('focus', onFocus);
      stopPolling();
    };
  }, [claim, stopPolling]);

  async function signIn() {
    setLoading(true);
    let target = callbackURL;
    if (isInstalledApp()) {
      const h = newHandoffCode();
      savePendingHandoff({ h, next: callbackURL, startedAt: Date.now() });
      target = handoffCallbackURL(h);
      stopPolling();
      poll.current = window.setInterval(() => {
        if (pendingHandoff()) void claim();
        else stopPolling();
      }, POLL_MS);
    }
    const { error } = await authClient.signIn.social({ provider: 'google', callbackURL: target, errorCallbackURL: ERROR_CALLBACK_URL });
    if (error) {
      stopPolling();
      clearPendingHandoff();
      setLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      className="h-12 w-full gap-3 border-ink/30 bg-surface text-base font-medium text-ink hover:bg-surface-sunk hover:text-ink dark:border-ink/30 dark:bg-surface dark:hover:bg-surface-sunk"
      disabled={loading}
      onClick={() => void signIn()}
    >
      <GoogleMark />
      {loading ? 'Abriendo Google…' : 'Entrar con Google'}
    </Button>
  );
}
