import { eq } from 'drizzle-orm';
import { db } from '../src/db';
import * as s from '../src/db/schema';
import { isAllowedEmail } from '../src/features/auth/allowlist';
import { currentYearMonth } from '../src/lib/year-month';
import { seedData } from './seed-data';
import { seedOwner, validate } from './seed-core';

async function main() {
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
