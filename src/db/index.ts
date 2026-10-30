import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from './schema';
import type { Db } from './types';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.on('error', (e: Error) => console.error('Error en el pool de Neon', e));

export const db: Db = drizzle(pool, { schema });
