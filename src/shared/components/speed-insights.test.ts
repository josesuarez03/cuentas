import { expect, it } from 'vitest';
import { withoutQuery } from './speed-insights';

it('no manda la query ni el fragmento (los enlaces de confirmar llevan el id de la entrada)', () => {
  expect(withoutQuery({ type: 'vital', url: 'https://kuadrix-eight.vercel.app/mes/2026-10?confirmar=e1#x' }))
    .toEqual({ type: 'vital', url: 'https://kuadrix-eight.vercel.app/mes/2026-10' });
});

it('quita un fragmento sin query', () => {
  expect(withoutQuery({ type: 'vital', url: 'https://kuadrix-eight.vercel.app/mes/2026-10#nomina' }))
    .toEqual({ type: 'vital', url: 'https://kuadrix-eight.vercel.app/mes/2026-10' });
});

it('deja igual una URL sin query ni fragmento', () => {
  expect(withoutQuery({ type: 'vital', url: 'https://kuadrix-eight.vercel.app/patrimonio' }))
    .toEqual({ type: 'vital', url: 'https://kuadrix-eight.vercel.app/patrimonio' });
});
