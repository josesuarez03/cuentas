import { APIError } from 'better-auth/api';
import { isAllowedEmail } from './allowlist';

export async function guardNewUser<T extends { email: string }>(user: T): Promise<{ data: T }> {
  if (!isAllowedEmail(user.email)) {
    throw new APIError('FORBIDDEN', { code: 'email_no_permitido', message: 'Este email no tiene acceso.' });
  }
  return { data: user };
}
