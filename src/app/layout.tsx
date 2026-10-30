import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans } from 'next/font/google';
import './globals.css';

const plex = IBM_Plex_Sans({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-plex' });

export const metadata: Metadata = { title: 'Kuadrix', description: 'Que el mes te cuadre.' };

// viewportFit 'cover' hace que env(safe-area-inset-bottom) valga en iPhone.
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={plex.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
