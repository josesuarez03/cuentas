import { describe, expect, it } from 'vitest';
import { dbDriver } from './driver';

describe('dbDriver', () => {
  it('Neon por defecto', () => {
    expect(dbDriver({})).toBe('neon');
    expect(dbDriver({ DATABASE_DRIVER: '' })).toBe('neon');
    expect(dbDriver({ DATABASE_DRIVER: 'neon', VERCEL: '1' })).toBe('neon');
  });
  it('pg solo fuera de Vercel (E2E en local o CI)', () => {
    expect(dbDriver({ DATABASE_DRIVER: 'pg' })).toBe('pg');
    expect(() => dbDriver({ DATABASE_DRIVER: 'pg', VERCEL: '1' })).toThrow('DATABASE_DRIVER=pg es solo para E2E (local o CI), nunca en Vercel.');
  });
  it('rechaza valores desconocidos', () => {
    expect(() => dbDriver({ DATABASE_DRIVER: 'mysql' })).toThrow('DATABASE_DRIVER desconocido: mysql');
  });
});
