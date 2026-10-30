export type PushHint = 'ios-install' | 'ios-old' | 'unsupported';

export const PUSH_HINT_TEXT: Record<PushHint, string> = {
  'ios-install':
    'En iPhone, los avisos push llegan con Kuadrix instalada. Añádela a la pantalla de inicio desde Compartir → Añadir a pantalla de inicio (iOS 16.4+) y ábrela desde el icono. Mientras, te avisamos por correo.',
  'ios-old': 'Tu versión de iOS no admite avisos push (hace falta iOS 16.4 o posterior). Te avisamos por correo.',
  unsupported: 'Este navegador no admite avisos push. Te avisamos por correo.',
};

export function pushHint(env: { userAgent: string; maxTouchPoints: number; standalone: boolean }): PushHint {
  const ios =
    /iPhone|iPad|iPod/.test(env.userAgent) || (/Macintosh/.test(env.userAgent) && env.maxTouchPoints > 1);
  if (!ios) return 'unsupported';
  return env.standalone ? 'ios-old' : 'ios-install';
}

export function currentPushHint(): PushHint {
  return pushHint({
    userAgent: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints,
    standalone:
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as { standalone?: boolean }).standalone === true,
  });
}
