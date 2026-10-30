export type LandingState = { signedIn: boolean; denied: boolean; needsOnboarding: boolean };

export function landingPath(s: LandingState): '/login' | '/login?error=acceso' | '/primer-uso' | '/inicio' {
  if (s.denied) return '/login?error=acceso';
  if (!s.signedIn) return '/login';
  return s.needsOnboarding ? '/primer-uso' : '/inicio';
}
