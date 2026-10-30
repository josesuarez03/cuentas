import { expect, it } from 'vitest';
import { firstLoadKb } from './first-load';

it('suma cada .js una vez por ruta y nombra la ruta sin grupos', () => {
  const sizes: Record<string, number> = { 'a.js': 1024, 'b.js': 2048, 'c.css': 9999 };
  expect(firstLoadKb({ '/(app)/ajustes/page': ['a.js', 'b.js', 'a.js', 'c.css'], '/page': ['a.js'], '/_not-found/page': ['a.js'], '/layout': ['b.js'] }, (f) => sizes[f]))
    .toEqual({ '/ajustes': 3, '/': 1, '/_not-found': 1 });
});
