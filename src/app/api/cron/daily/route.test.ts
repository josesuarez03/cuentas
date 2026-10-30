import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/db', () => ({ db: {} }));
vi.mock('@/features/notifications/server/email', () => ({ sendEmail: vi.fn() }));
vi.mock('@/features/notifications/server/push', () => ({ sendPush: vi.fn() }));
const runDaily = vi.hoisted(() => vi.fn());
vi.mock('@/features/cron/server/run-daily', () => ({ runDaily }));
const { GET } = await import('./route');

const call = (auth?: string) => GET(new Request('https://k.test/api/cron/daily', { headers: auth ? { authorization: auth } : {} }));
const ok = { users: 2, monthsCreated: 0, monthsClosed: 0, sent: 1, failed: 0, errors: 0 };

afterEach(() => { vi.unstubAllEnvs(); runDaily.mockReset(); });

describe('GET /api/cron/daily', () => {
  it('sin CRON_SECRET configurado: 401 siempre', async () => {
    vi.stubEnv('CRON_SECRET', '');
    expect((await call('Bearer ')).status).toBe(401);
    expect(runDaily).not.toHaveBeenCalled();
  });
  it('sin cabecera o con otro secreto: 401', async () => {
    vi.stubEnv('CRON_SECRET', 's3cr3t');
    expect((await call()).status).toBe(401);
    expect((await call('Bearer otro')).status).toBe(401);
    expect(runDaily).not.toHaveBeenCalled();
  });
  it('con el secreto: ejecuta y devuelve el resumen', async () => {
    vi.stubEnv('CRON_SECRET', 's3cr3t');
    vi.stubEnv('BETTER_AUTH_URL', 'https://kuadrix-eight.vercel.app');
    runDaily.mockResolvedValue(ok);
    const res = await call('Bearer s3cr3t');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(ok);
    expect(runDaily.mock.calls[0][1]).toBeInstanceOf(Date);
    expect(runDaily.mock.calls[0][2].baseUrl).toBe('https://kuadrix-eight.vercel.app');
  });
  it('si algún usuario falla: 500 con el resumen', async () => {
    vi.stubEnv('CRON_SECRET', 's3cr3t');
    runDaily.mockResolvedValue({ ...ok, errors: 1 });
    expect((await call('Bearer s3cr3t')).status).toBe(500);
  });
});
