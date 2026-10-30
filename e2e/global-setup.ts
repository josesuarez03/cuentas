import { mkdirSync, writeFileSync } from 'node:fs';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { sql } from 'drizzle-orm';
import pg from 'pg';
import * as schema from '@/db/schema';
import type { Db } from '@/db/types';
import { completeOnboarding } from '@/features/onboarding/server/onboarding';
import { rollMonth } from '@/features/month/server/lifecycle';
import { currentYearMonth } from '@/lib/year-month';
import { seedSession, signSessionCookie, storageStateFor } from './support/session';

const BASE_URL = 'http://localhost:3100';

export default async function globalSetup() {
  const host = new URL(process.env.DATABASE_URL!).hostname;
  if (host !== 'localhost' && host !== '127.0.0.1') {
    throw new Error('Las E2E solo corren contra el Postgres local (pnpm e2e:db).');
  }

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const db = drizzle(pool, { schema });
    await migrate(db, { migrationsFolder: 'drizzle' });
    await db.execute(sql`TRUNCATE TABLE "user" CASCADE`);

    const ana = await seedSession(db as unknown as Db, { email: 'ana@e2e.kuadrix.test', name: 'Ana' });
    const nuevo = await seedSession(db as unknown as Db, { email: 'nuevo@e2e.kuadrix.test', name: 'Nuevo' });

    const ym = currentYearMonth();
    await completeOnboarding(db as unknown as Db, ana.userId, {
      accounts: [{ name: 'BBVA principal', bank: 'BBVA', type: 'checking', balanceCents: 250000 }],
      salary: { amountCents: 187000, accountIndex: 0, paydayDay: 27 },
      items: [{ name: 'Alquiler', category: 'Piso', amountCents: 80000, accountIndex: 0 }],
    }, ym);
    await rollMonth(db as unknown as Db, ana.userId, ym);

    const [nomina] = await db
      .select({ id: schema.entries.id })
      .from(schema.entries)
      .innerJoin(schema.months, eq(schema.months.id, schema.entries.monthId))
      .where(and(eq(schema.months.userId, ana.userId), eq(schema.months.yearMonth, ym), eq(schema.entries.name, 'Nómina')));

    mkdirSync('e2e/.auth', { recursive: true });
    const secret = process.env.BETTER_AUTH_SECRET!;
    writeFileSync('e2e/.auth/ana.json', JSON.stringify(storageStateFor(await signSessionCookie(ana.token, secret), BASE_URL)));
    writeFileSync('e2e/.auth/nuevo.json', JSON.stringify(storageStateFor(await signSessionCookie(nuevo.token, secret), BASE_URL)));
    writeFileSync('e2e/.auth/data.json', JSON.stringify({ ym, nominaEntryId: nomina.id }));
  } finally {
    await pool.end();
  }
}
