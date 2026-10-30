import { existsSync } from 'node:fs';
import { eq } from 'drizzle-orm';
import { db } from '../src/db';
import * as s from '../src/db/schema';
import { isAllowedEmail } from '../src/features/auth/allowlist';
import { currentYearMonth } from '../src/lib/year-month';
import type { SeedData } from './seed-core';
import { seedOwner, validate } from './seed-core';

// Los datos reales van en seed-data.local.ts (ignorado por git); seed-data.ts es solo la plantilla.
async function loadSeedData(): Promise<SeedData> {
  const local = new URL('./seed-data.local.ts', import.meta.url);
  if (!existsSync(local)) throw new Error('Copia scripts/seed-data.ts a scripts/seed-data.local.ts y rellena tus datos.');
  return (await import(local.href)).seedData;
}

async function main() {
  const seedData = await loadSeedData();
  validate(seedData);
  const email = process.env.SEED_EMAIL;
  if (!email) throw new Error('Define SEED_EMAIL en .env.local');
  if (!isAllowedEmail(email)) throw new Error(`${email} no está en ALLOWED_EMAILS; no se siembra.`);
  const [owner] = await db.select().from(s.user).where(eq(s.user.email, email));
  if (!owner) throw new Error(`No existe ${email}. Entra una vez en la app con Google y vuelve a ejecutar.`);

  await seedOwner(db, owner.id, seedData, currentYearMonth());
  console.log(`Datos iniciales creados para ${email}.`);
}

main().then(() => process.exit(0)).catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
