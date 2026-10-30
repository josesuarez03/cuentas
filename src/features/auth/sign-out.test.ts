// @vitest-environment jsdom
import { QueryClient } from '@tanstack/react-query';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { signOutAndClear } from './sign-out';

const auth = vi.hoisted(() => ({ signOut: vi.fn() }));
vi.mock('@/features/auth/auth-client', () => ({ authClient: auth }));

const replace = vi.fn();
let deleted: string[] = [];

function fakeCaches(names: string[]) {
  deleted = [];
  vi.stubGlobal('caches', {
    keys: vi.fn(async () => names),
    delete: vi.fn(async (n: string) => { deleted.push(n); return true; }),
  });
}

beforeEach(() => {
  vi.stubGlobal('location', { ...window.location, replace });
});
afterEach(() => { vi.clearAllMocks(); vi.unstubAllGlobals(); });

it('cierra sesión, borra las cachés de datos (no la estática ni la precache), vacía TanStack y va a /login', async () => {
  auth.signOut.mockResolvedValue({ data: { success: true }, error: null });
  fakeCaches(['kuadrix-api-v1', 'kuadrix-pages-v1', 'kuadrix-static-v1', 'serwist-precache-v2-http://x/']);
  const qc = new QueryClient();
  qc.setQueryData(['settings'], { a: 1 });

  const result = await signOutAndClear(qc);

  expect(result).toEqual({ ok: true });
  expect(deleted.sort()).toEqual(['kuadrix-api-v1', 'kuadrix-pages-v1']);
  expect(qc.getQueryData(['settings'])).toBeUndefined();
  expect(replace).toHaveBeenCalledWith('/login');
});

it('sin Cache Storage, cierra sesión igual', async () => {
  auth.signOut.mockResolvedValue({ data: { success: true }, error: null });
  vi.stubGlobal('caches', undefined);
  const result = await signOutAndClear(new QueryClient());
  expect(result).toEqual({ ok: true });
  expect(replace).toHaveBeenCalledWith('/login');
});

it('si falla el cierre de sesión, no borra nada ni navega', async () => {
  auth.signOut.mockResolvedValue({ data: null, error: { message: 'boom', status: 500 } });
  fakeCaches(['kuadrix-api-v1']);
  const qc = new QueryClient();
  qc.setQueryData(['settings'], { a: 1 });

  const result = await signOutAndClear(qc);

  expect(result).toEqual({ ok: false });
  expect(deleted).toEqual([]);
  expect(qc.getQueryData(['settings'])).toEqual({ a: 1 });
  expect(replace).not.toHaveBeenCalled();
});

it('si signOut lanza (sin red), no borra nada ni navega', async () => {
  auth.signOut.mockRejectedValue(new TypeError('Failed to fetch'));
  fakeCaches(['kuadrix-api-v1']);
  const result = await signOutAndClear(new QueryClient());
  expect(result).toEqual({ ok: false });
  expect(deleted).toEqual([]);
  expect(replace).not.toHaveBeenCalled();
});
