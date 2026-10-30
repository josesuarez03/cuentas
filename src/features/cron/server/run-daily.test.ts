import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as s from '@/db/schema';
import type { Db } from '@/db/types';
import { ensureMonth, findMonth } from '@/features/month/server/months';
import type { Senders } from '@/features/notifications/server/notify';
import { createTestDb } from '@/test/db';
import { createFixture } from '@/test/fixtures';
import { runDaily } from './run-daily';

let db: Db;
let senders: { email: ReturnType<typeof vi.fn>; push: ReturnType<typeof vi.fn> };
const deps = () => ({ baseUrl: 'https://k.test', senders: senders as unknown as Senders });

beforeEach(async () => {
  vi.stubEnv('ALLOWED_EMAILS', 'u1@example.com,u2@example.com');
  db = await createTestDb();
  await createFixture(db, 'u1');
  await ensureMonth(db, 'u1', '2026-10');
  senders = { email: vi.fn().mockResolvedValue(true), push: vi.fn().mockResolvedValue('sent') };
});

describe('runDaily', () => {
  it('el mes cambia a medianoche de Madrid, no de UTC', async () => {
    const before = await runDaily(db, new Date('2026-10-31T22:30:00Z'), deps()); // 23:30 del 31 en Madrid
    expect(before).toMatchObject({ users: 1, monthsCreated: 0, monthsClosed: 0 });
    const after = await runDaily(db, new Date('2026-10-31T23:30:00Z'), deps());   // 00:30 del 1 de noviembre
    expect(after).toMatchObject({ users: 1, monthsCreated: 1, monthsClosed: 1, errors: 0 });
    expect((await findMonth(db, 'u1', '2026-10'))!.status).toBe('closed');
    expect((await findMonth(db, 'u1', '2026-11'))!.status).toBe('open');
  });
  it('idempotente el día 1 a las 08:00 de Madrid', async () => {
    await runDaily(db, new Date('2026-11-01T07:00:00Z'), deps());
    expect(await runDaily(db, new Date('2026-11-01T07:30:00Z'), deps())).toMatchObject({ monthsCreated: 0, monthsClosed: 0, sent: 0 });
  });
  it('ignora usuarios sin cuentas o fuera de ALLOWED_EMAILS', async () => {
    await db.insert(s.user).values({ id: 'u3', name: 'Nadie', email: 'u2@example.com' });  // permitido pero sin cuentas
    await createFixture(db, 'u4');                                                         // con cuentas pero no permitido
    expect((await runDaily(db, new Date('2026-11-01T07:00:00Z'), deps())).users).toBe(1);
    expect(await findMonth(db, 'u4', '2026-11')).toBeNull();
  });
  it('avisa el día de cobro y un fallo de un usuario no para a los demás', async () => {
    await createFixture(db, 'u2');
    senders.email.mockImplementation(async (to: string) => { if (to === 'u1@example.com') throw new Error('caída'); return true; });
    const summary = await runDaily(db, new Date('2026-12-24T07:00:00Z'), deps());   // jueves 24: cobro de las dos nóminas
    expect(summary).toMatchObject({ users: 2, sent: 1, errors: 1 });
    expect((await db.select().from(s.notificationsLog)).map((r) => r.userId)).toEqual(['u2']); // el de u1 queda libre para reintentar
  });
});
