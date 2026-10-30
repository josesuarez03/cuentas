import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

/** kB gzip de los `.js` únicos de cada página del manifiesto, con la ruta sin grupos `(…)` ni `/page`. */
export function firstLoadKb(pages: Record<string, string[]>, gzipSize: (file: string) => number): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [key, files] of Object.entries(pages)) {
    if (!key.endsWith('/page')) continue;
    const route = key.replace(/\/\([^/]*\)/g, '').replace(/\/page$/, '') || '/';
    const bytes = [...new Set(files)].filter((f) => f.endsWith('.js')).reduce((sum, f) => sum + gzipSize(f), 0);
    result[route] = Math.round((bytes / 1024) * 10) / 10;
  }
  return result;
}

if (process.argv[1]?.endsWith('first-load.ts')) {
  const manifest = JSON.parse(readFileSync('.next/app-build-manifest.json', 'utf8')) as { pages: Record<string, string[]> };
  const sizes = firstLoadKb(manifest.pages, (f) => gzipSync(readFileSync(`.next/${f}`)).length);
  for (const [route, kb] of Object.entries(sizes).sort(([a], [b]) => a.localeCompare(b))) {
    console.log(`${route.padEnd(32)}${kb.toFixed(1).padStart(8)} kB`);
  }
}
