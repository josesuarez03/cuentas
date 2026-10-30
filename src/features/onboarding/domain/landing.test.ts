import { expect, it } from 'vitest';
import { landingPath } from './landing';

it('decide el destino final de / en un solo paso', () => {
  expect(landingPath({ signedIn: false, denied: false, needsOnboarding: false })).toBe('/login');
  expect(landingPath({ signedIn: false, denied: true, needsOnboarding: false })).toBe('/login?error=acceso');
  expect(landingPath({ signedIn: true, denied: false, needsOnboarding: true })).toBe('/primer-uso');
  expect(landingPath({ signedIn: true, denied: false, needsOnboarding: false })).toBe('/inicio');
});
