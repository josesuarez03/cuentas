import { mkdirSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

export const ICON_TARGETS: { source: 'kuadrix-mark.svg' | 'kuadrix-maskable.svg'; out: string; size: number; opaque: boolean }[] = [
  { source: 'kuadrix-mark.svg', out: 'public/icons/icon-192.png', size: 192, opaque: false },
  { source: 'kuadrix-mark.svg', out: 'public/icons/icon-512.png', size: 512, opaque: false },
  { source: 'kuadrix-maskable.svg', out: 'public/icons/icon-maskable-512.png', size: 512, opaque: true },
  { source: 'kuadrix-maskable.svg', out: 'src/app/apple-icon.png', size: 180, opaque: true },
  { source: 'kuadrix-mark.svg', out: 'src/app/icon.png', size: 48, opaque: false },
];

/** Colores hex (minúscula) del primer bloque `:root` de globals.css, el tema claro. */
export function lightTokenColors(css: string): string[] {
  const start = css.indexOf(':root {');
  if (start === -1) return [];
  const end = css.indexOf('}', start);
  return [...css.slice(start, end).matchAll(/#[0-9a-f]{6}\b/gi)].map((m) => m[0].toLowerCase());
}

export async function makeIcons(root: string = process.cwd()): Promise<void> {
  for (const t of ICON_TARGETS) {
    const out = path.join(root, t.out);
    mkdirSync(path.dirname(out), { recursive: true });
    let img = sharp(path.join(__dirname, 'icons', t.source), { density: 384 }).resize(t.size, t.size);
    if (t.opaque) img = img.flatten({ background: '#f3f4f6' });
    await img.png({ compressionLevel: 9 }).toFile(out);
  }
}

if (process.argv[1]?.endsWith('make-icons.ts')) {
  makeIcons().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
