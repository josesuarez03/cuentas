import { expect, it } from 'vitest';
import { assertLocalE2eDatabase } from './local-db';

it('acepta el Postgres de pnpm e2e:db', () => {
  expect(() => assertLocalE2eDatabase('postgres://kuadrix:kuadrix@localhost:5543/kuadrix_e2e')).not.toThrow();
  expect(() => assertLocalE2eDatabase('postgres://kuadrix:kuadrix@127.0.0.1:5543/kuadrix_e2e')).not.toThrow();
});

it('rechaza otro host', () => {
  expect(() => assertLocalE2eDatabase('postgres://u:p@ep-algo.neon.tech:5543/kuadrix_e2e')).toThrow(/Postgres local/);
});

it('rechaza otro puerto aunque sea localhost', () => {
  expect(() => assertLocalE2eDatabase('postgres://u:p@localhost:5432/kuadrix_e2e')).toThrow(/Postgres local/);
  expect(() => assertLocalE2eDatabase('postgres://u:p@localhost/kuadrix_e2e')).toThrow(/Postgres local/);
});

it('rechaza otra base de datos aunque sea localhost:5543', () => {
  expect(() => assertLocalE2eDatabase('postgres://u:p@localhost:5543/kuadrix')).toThrow(/Postgres local/);
});

it('rechaza una URL ausente o inválida', () => {
  expect(() => assertLocalE2eDatabase(undefined)).toThrow(/Postgres local/);
  expect(() => assertLocalE2eDatabase('no es una url')).toThrow(/Postgres local/);
});
