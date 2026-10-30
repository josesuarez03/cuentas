import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans } from 'next/font/google';
import { ThemeProvider } from '@/shared/components/providers';
import './globals.css';

const plex = IBM_Plex_Sans({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-plex' });

export const metadata: Metadata = {
  title: 'Kuadrix',
  description: 'Que el mes te cuadre.',
  applicationName: 'Kuadrix',
  appleWebApp: { capable: true, title: 'Kuadrix', statusBarStyle: 'default' },
  formatDetection: { telephone: false }, // iOS no convierte importes en teléfonos
};

// viewportFit 'cover' hace que env(safe-area-inset-bottom) valga en iPhone.
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f3f4f6' },
    { media: '(prefers-color-scheme: dark)', color: '#121519' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={plex.variable} suppressHydrationWarning>
      <body className="font-sans antialiased"><ThemeProvider>{children}</ThemeProvider></body>
    </html>
  );
}
