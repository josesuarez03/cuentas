import { describe, expect, it } from 'vitest';
import { isAllowedEmail } from './allowlist';
import { guardNewUser } from './auth-guard';

const LIST = 'jose@example.com, Pareja@Example.com';

describe('isAllowedEmail', () => {
  it('acepta emails de la lista sin importar mayúsculas ni espacios', () => {
    expect(isAllowedEmail('JOSE@example.com', LIST)).toBe(true);
    expect(isAllowedEmail(' pareja@example.com ', LIST)).toBe(true);
  });
  it('rechaza el resto', () => {
    expect(isAllowedEmail('otro@example.com', LIST)).toBe(false);
    expect(isAllowedEmail(null, LIST)).toBe(false);
    expect(isAllowedEmail('jose@example.com', '')).toBe(false);
  });
});

describe('guardNewUser', () => {
  it('bloquea el alta de emails fuera de la lista', async () => {
    process.env.ALLOWED_EMAILS = LIST;
    await expect(guardNewUser({ email: 'otro@example.com' })).rejects.toThrow('Este email no tiene acceso.');
    await expect(guardNewUser({ email: 'jose@example.com' })).resolves.toEqual({ data: { email: 'jose@example.com' } });
  });
});
