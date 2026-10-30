import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Kuadrix',
    short_name: 'Kuadrix',
    description: 'Que el mes te cuadre.',
    lang: 'es',
    dir: 'ltr',
    start_url: '/inicio',
    scope: '/',
    display: 'standalone',
    background_color: '#f3f4f6',
    theme_color: '#f3f4f6',
    categories: ['finance'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
