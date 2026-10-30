import { existsSync, readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import manifest from './manifest';

it('instalable: nombre, standalone, /inicio e iconos 192/512/maskable', () => {
  const m = manifest();
  expect(m).toMatchObject({
    id: '/', name: 'Kuadrix', short_name: 'Kuadrix', description: 'Que el mes te cuadre.', lang: 'es',
    start_url: '/inicio', scope: '/', display: 'standalone', background_color: '#f3f4f6', theme_color: '#f3f4f6',
  });
  expect(m.icons).toEqual([
    { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ]);
  for (const i of m.icons ?? []) expect(existsSync(`public${i.src}`), i.src).toBe(true);
  expect(readFileSync('src/app/globals.css', 'utf8')).toContain('--paper: #f3f4f6;');
});
