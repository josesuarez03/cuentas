export type DbDriver = 'neon' | 'pg';

export function dbDriver(env: { DATABASE_DRIVER?: string; VERCEL?: string }): DbDriver {
  const driver = env.DATABASE_DRIVER;
  if (!driver || driver === 'neon') return 'neon';
  if (driver === 'pg') {
    if (env.VERCEL === '1') {
      throw new Error('DATABASE_DRIVER=pg es solo para E2E (local o CI), nunca en Vercel.');
    }
    return 'pg';
  }
  throw new Error(`DATABASE_DRIVER desconocido: ${driver}`);
}
