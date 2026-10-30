import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { dbDriver } from './driver';
import * as schema from './schema';
import type { Db } from './types';

function connect(): Db {
  if (dbDriver({ DATABASE_DRIVER: process.env.DATABASE_DRIVER, VERCEL: process.env.VERCEL }) === 'pg') {
    return drizzlePg(new pg.Pool({ connectionString: process.env.DATABASE_URL }), { schema });
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  pool.on('error', (e: Error) => console.error('Error en el pool de Neon', e));
  return drizzle(pool, { schema });
}

export const db: Db = connect();
