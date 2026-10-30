'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { useState } from 'react';
import { Toaster } from '@/shared/components/ui/sonner';

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, networkMode: 'always' }, mutations: { networkMode: 'always' } } }));
  return (
    <QueryClientProvider client={client}>
      {children}
      <Toaster position="top-center" />
    </QueryClientProvider>
  );
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  );
}
