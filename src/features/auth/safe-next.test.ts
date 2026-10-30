import { describe, expect, it } from 'vitest';
import { safeNext } from './safe-next';

describe('safeNext', () => {
  it('acepta rutas propias con query', () => {
    expect(safeNext('/mes/2026-12?confirmar=e1')).toBe('/mes/2026-12?confirmar=e1');
  });
  it('rechaza lo que podría salir del sitio o volver al login', () => {
    for (const bad of [null, undefined, '', 'https://evil.com', '//evil.com', '/\\evil.com', 'mes', '/login', '/login?next=/x', '/login/x', '/\t/evil.com', '/\n/evil.com', '/ /evil.com', 'javascript:alert(1)', '/\\\\evil.com']) {
      expect(safeNext(bad)).toBe('/inicio');
    }
  });
});
