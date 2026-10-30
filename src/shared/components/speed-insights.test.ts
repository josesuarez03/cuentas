import { expect, it } from 'vitest';
import { withoutQuery } from './speed-insights';

it('no manda la query ni el fragmento (los enlaces de confirmar llevan el id de la entrada)', () => {
  expect(withoutQuery({ type: 'vital', url: 'https://kuadrix-eight.vercel.app/mes/2026-10?confirmar=e1#x' }))
    .toEqual({ type: 'vital', url: 'https://kuadrix-eight.vercel.app/mes/2026-10' });
});
