// Entrar con Google desde la PWA instalada: Google se abre en una ventana aparte
// (en iPhone, el navegador superpuesto) y, al terminar, esa ventana avisa a la PWA y se cierra.

export const SIGNED_IN = 'kuadrix:signed-in';
export const SIGNIN_ERROR = 'kuadrix:signin-error';
export const POPUP_CALLBACK_URL = '/entrar/listo';
export const ERROR_CALLBACK_URL = '/login?error=acceso';

export function isInstalledApp(): boolean {
  const standalone = typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches;
  return standalone || (navigator as { standalone?: boolean }).standalone === true;
}

/** La ventana que abrió esta, si es de Kuadrix (otro origen lanza al leer `location`). */
export function kuadrixOpener(): Window | null {
  try {
    const opener = window.opener as Window | null;
    return opener && opener.location.origin === window.location.origin ? opener : null;
  } catch {
    return null;
  }
}
