const FALLBACK = '/inicio';

// Solo rutas relativas propias: evita open redirect (//host, /\host, esquemas) y bucles con /login.
export function safeNext(value: string | null | undefined): string {
  if (!value || !value.startsWith('/')) return FALLBACK;
  // Espacios y caracteres de control: el navegador los elimina y '/\t/host' pasaría a '//host'.
  if (/[\s\u0000-\u001f\u007f]/.test(value)) return FALLBACK;
  if (value.startsWith('//') || value.startsWith('/\\')) return FALLBACK;
  if (value === '/login' || value.startsWith('/login?') || value.startsWith('/login/')) return FALLBACK;
  return value;
}
