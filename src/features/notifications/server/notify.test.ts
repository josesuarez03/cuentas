import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as s from '@/db/schema';
import type { Db } from '@/db/types';
import { ensureMonth } from '@/features/month/server/months';
import { updatePreferences } from '@/features/settings/server/settings';
import { createTestDb } from '@/test/db';
import { createFixture, type Fixture } from '@/test/fixtures';
import { saveSubscription, listSubscriptions } from './subscriptions';
import { notifyUser, type Senders } from './notify';

let db: Db;
let f: Fixture;
let senders: { email: ReturnType<typeof vi.fn>; push: ReturnType<typeof vi.fn> };
const user = { id: 'u1', email: 'u1@example.com' };
const run = (today: string) => notifyUser(db, user, today, '2026-12', { region: 'ES-MD', baseUrl: 'https://k.test', senders: senders as unknown as Senders });

beforeEach(async () => {
  db = await createTestDb();
  f = await createFixture(db);
  await ensureMonth(db, f.userId, '2026-12');   // nómina: cobro el jueves 24
  senders = { email: vi.fn().mockResolvedValue(true), push: vi.fn().mockResolvedValue('sent') };
});

describe('notifyUser', () => {
  it('el día de cobro manda un correo con el enlace de confirmar', async () => {
    expect(await run('2026-12-24')).toEqual({ sent: 1, skipped: 0, failed: 0 });
    const [to, msg] = senders.email.mock.calls[0];
    expect(to).toBe('u1@example.com');
    expect(msg.subject).toBe('Nómina: hoy es el día de cobro');
    expect(msg.text).toMatch(/https:\/\/k\.test\/mes\/2026-12\?confirmar=[0-9a-f-]{36}/);
    expect(senders.push).not.toHaveBeenCalled();   // push desactivado por defecto
  });
  it('una segunda ejecución el mismo día no reenvía', async () => {
    await run('2026-12-24');
    expect(await run('2026-12-24')).toEqual({ sent: 0, skipped: 1, failed: 0 });
    expect(senders.email).toHaveBeenCalledTimes(1);
  });
  it('al día siguiente, un único recordatorio; después, nada', async () => {
    await run('2026-12-24');
    await run('2026-12-25');
    await run('2026-12-25');
    await run('2026-12-26');
    expect(senders.email.mock.calls.map((c) => c[1].subject)).toEqual(['Nómina: hoy es el día de cobro', 'Nómina sigue pendiente']);
  });
  it('confirmada o fuera de fecha: nada', async () => {
    await db.update(s.entries).set({ status: 'confirmed' }).where(eq(s.entries.recurringItemId, f.items.nomina));
    expect(await run('2026-12-24')).toEqual({ sent: 0, skipped: 0, failed: 0 });
  });
  it('respeta las preferencias: sin correo ni push no envía ni registra', async () => {
    await updatePreferences(db, f.userId, { emailNotifications: false, pushNotifications: false });
    await run('2026-12-24');
    expect(senders.email).not.toHaveBeenCalled();
    expect(await db.select().from(s.notificationsLog)).toEqual([]);
  });
  it('borra la suscripción caducada y sigue con las demás', async () => {
    await updatePreferences(db, f.userId, { emailNotifications: false, pushNotifications: true });
    await saveSubscription(db, f.userId, { endpoint: 'https://push.example/old', p256dh: 'p', auth: 'a' });
    await saveSubscription(db, f.userId, { endpoint: 'https://push.example/new', p256dh: 'p', auth: 'a' });
    senders.push.mockImplementation(async (t: { endpoint: string }) => (t.endpoint.endsWith('old') ? 'gone' : 'sent'));
    expect(await run('2026-12-24')).toEqual({ sent: 1, skipped: 0, failed: 0 });
    expect((await listSubscriptions(db, f.userId)).map((t) => t.endpoint)).toEqual(['https://push.example/new']);
    expect(senders.push.mock.calls[0][1]).toMatchObject({ title: 'Nómina: hoy es el día de cobro', tag: expect.stringMatching(/^payday:/) });
  });
  it('si no se entrega por ningún canal, libera el aviso para reintentar', async () => {
    senders.email.mockResolvedValueOnce(false);
    expect(await run('2026-12-24')).toEqual({ sent: 0, skipped: 0, failed: 1 });
    expect(await db.select().from(s.notificationsLog)).toEqual([]);
    expect(await run('2026-12-24')).toEqual({ sent: 1, skipped: 0, failed: 0 });
    expect((await db.select().from(s.notificationsLog))[0].refKey).toBe(`payday:${f.items.nomina}:2026-12:1`);
  });
});
