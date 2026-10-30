import { createHash, randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import * as z from 'zod';
import * as s from '@/db/schema';
import type { Db } from '@/db/types';

// Vuelta a la PWA de iPhone: el navegador superpuesto donde se entra con Google no comparte
// cookies con la PWA. Ese navegador deja un token de un solo uso de Better Auth bajo un código
// que solo conoce la PWA (32 bytes aleatorios) y la PWA lo canjea por su propia cookie.
// En la BD solo se guarda el sha256 del código.

export const HANDOFF_TTL_MS = 3 * 60 * 1000;

const body = z.object({ h: z.string().regex(/^[A-Za-z0-9_-]{43}$/) });

/** El código de un cuerpo `{ h }`, o null si no es válido. */
export async function readHandoffCode(request: Request): Promise<string | null> {
  try {
    const parsed = body.safeParse(await request.json());
    return parsed.success ? parsed.data.h : null;
  } catch {
    return null;
  }
}

function identifier(h: string): string {
  return `kuadrix-handoff:${createHash('sha256').update(h).digest('hex')}`;
}

export async function saveHandoff(db: Db, h: string, token: string): Promise<void> {
  const id = identifier(h);
  await db.transaction(async (tx) => {
    await tx.delete(s.verification).where(eq(s.verification.identifier, id));
    await tx.insert(s.verification).values({ id: randomUUID(), identifier: id, value: token, expiresAt: new Date(Date.now() + HANDOFF_TTL_MS) });
  });
}

/** Consume el código (una sola vez, aunque haya caducado) y devuelve su token si sigue vigente. */
export async function takeHandoff(db: Db, h: string): Promise<string | null> {
  const rows = await db.delete(s.verification).where(eq(s.verification.identifier, identifier(h)))
    .returning({ value: s.verification.value, expiresAt: s.verification.expiresAt });
  const now = Date.now();
  return rows.find((r) => r.expiresAt.getTime() > now)?.value ?? null;
}
