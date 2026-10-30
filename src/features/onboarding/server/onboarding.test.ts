import { asc } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import * as s from '@/db/schema';
import type { Db } from '@/db/types';
import { ensureMonth, getMonthView } from '@/features/month/server/months';
import { createTestDb } from '@/test/db';
import type { OnboardingInput } from '../domain/onboarding';
import { completeOnboarding, needsOnboarding } from './onboarding';

let db: Db;
beforeEach(async () => {
  db = await createTestDb();
  await db.insert(s.user).values({ id: 'u1', name: 'Jose', email: 'u1@example.com' });
});

const input: OnboardingInput = {
  accounts: [
    { name: 'BBVA principal', bank: 'BBVA', type: 'checking', balanceCents: 230000 },
    { name: 'Trade', bank: 'Trade Republic', type: 'investment', balanceCents: null },
    { name: 'Tarjeta BBVA', bank: 'BBVA', type: 'credit_card', balanceCents: 40000 },
  ],
  salary: { amountCents: 187000, accountIndex: 0, paydayDay: 27 },
  items: [{ name: 'Alquiler', category: 'Piso', amountCents: 48000, accountIndex: 0 }],
};

describe('completeOnboarding', () => {
  it('deja listo el mes: cuentas con saldo (tarjeta en negativo), nómina pendiente, alquiler y reparto 100 % a inversión', async () => {
    expect(await needsOnboarding(db, 'u1')).toBe(true);
    await ensureMonth(db, 'u1', '2026-10'); // entró antes: mes vacío que hay que rehacer
    await completeOnboarding(db, 'u1', input, '2026-10');
    expect(await needsOnboarding(db, 'u1')).toBe(false);
    const snaps = await db.select().from(s.balanceSnapshots);
    expect(snaps.map((x) => x.balanceCents).sort((a, b) => a - b)).toEqual([-40000, 230000]);
    await ensureMonth(db, 'u1', '2026-10');
    const v = (await getMonthView(db, 'u1', '2026-10'))!;
    const all = v.categories.flatMap((c) => c.entries);
    expect(all.find((e) => e.name === 'Nómina')).toMatchObject({ status: 'pending', amountCents: 187000 });
    expect(all.find((e) => e.name === 'Alquiler')!.amountCents).toBe(48000);
    expect(v.split).toMatchObject([{ accountName: 'Trade', percent: 100 }]);
    expect((await db.select().from(s.categories).orderBy(asc(s.categories.sortOrder))).map((c) => c.name)).toEqual(['Ingresos', 'Piso', 'Comida', 'Suscripciones', 'Otros']);
  });

  it('no se ejecuta dos veces', async () => {
    await completeOnboarding(db, 'u1', input, '2026-10');
    await expect(completeOnboarding(db, 'u1', input, '2026-10')).rejects.toThrow('Ya tienes cuentas; cambia lo que quieras en Ajustes.');
  });

  it('sin nómina ni partidas ni cuentas de ahorro también vale', async () => {
    await completeOnboarding(db, 'u1', { accounts: [input.accounts[0]], salary: null, items: [] }, '2026-10');
    await ensureMonth(db, 'u1', '2026-10');
    expect((await getMonthView(db, 'u1', '2026-10'))!.split).toEqual([]);
  });
});
