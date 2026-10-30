'use client';

import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { authClient } from '@/features/auth/auth-client';

export function LoginButton() {
  const [loading, setLoading] = useState(false);
  return (
    <Button
      className="h-12 w-full text-base"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        const { error } = await authClient.signIn.social({ provider: 'google', callbackURL: '/mes', errorCallbackURL: '/login?error=acceso' });
        if (error) setLoading(false);
      }}
    >
      {loading ? 'Abriendo Google…' : 'Entrar con Google'}
    </Button>
  );
}
