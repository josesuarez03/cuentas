import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { ICON_TARGETS, lightTokenColors, makeIcons } from './make-icons';

describe('iconos', () => {
  it('las fuentes SVG solo usan colores de los tokens claros', () => {
    const tokens = lightTokenColors(readFileSync('src/app/globals.css', 'utf8'));
    expect(tokens).toContain('#f3f4f6');
    for (const f of ['kuadrix-mark.svg', 'kuadrix-maskable.svg']) {
      const colors = [...readFileSync(path.join('scripts/icons', f), 'utf8').matchAll(/#[0-9a-f]{6}\b/gi)].map((m) => m[0].toLowerCase());
      expect(colors.length).toBeGreaterThan(0);
      for (const c of colors) expect(tokens).toContain(c);
    }
  });

  it('genera cada PNG con su tamaño; apple-icon sin transparencia', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'iconos-'));
    await makeIcons(root);
    expect(ICON_TARGETS.map((t) => [t.out, t.size])).toEqual([
      ['public/icons/icon-192.png', 192],
      ['public/icons/icon-512.png', 512],
      ['public/icons/icon-maskable-512.png', 512],
      ['src/app/apple-icon.png', 180],
      ['src/app/icon.png', 48],
    ]);
    for (const t of ICON_TARGETS) {
      const meta = await sharp(path.join(root, t.out)).metadata();
      expect([meta.format, meta.width, meta.height]).toEqual(['png', t.size, t.size]);
      if (t.opaque) expect(meta.hasAlpha).toBe(false);
    }
  });
});
