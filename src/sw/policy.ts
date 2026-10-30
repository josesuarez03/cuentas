export type CacheKind = 'api-read' | 'page' | 'static' | 'network-only';

export const CACHE = { api: 'kuadrix-api-v1', pages: 'kuadrix-pages-v1', static: 'kuadrix-static-v1' } as const;

const API_READ = [/^\/api\/months\/\d{4}-\d{2}$/, /^\/api\/wealth$/, /^\/api\/settings$/];

export function classify(req: { url: string; method: string; headers: Headers }, origin: string): CacheKind {
  if (req.method !== 'GET') return 'network-only';
  const url = new URL(req.url);
  if (url.origin !== origin) return 'network-only';
  const path = url.pathname;
  if (path.startsWith('/api/auth/') || path.startsWith('/api/cron/')) return 'network-only';
  if (API_READ.some((re) => re.test(path))) return 'api-read';
  if (path.startsWith('/api/')) return 'network-only';
  if (req.headers.get('RSC') === '1') return 'network-only';
  if (path.startsWith('/_next/static/') || path.startsWith('/icons/')) return 'static';
  if (path.startsWith('/serwist/') || path === '/') return 'network-only';
  // Lleva en la URL el código de un solo uso para volver a la PWA.
  if (path === '/entrar/listo') return 'network-only';
  const last = path.split('/').pop() ?? '';
  return last.includes('.') ? 'network-only' : 'page';
}

export function cachesToDelete(names: string[]): string[] {
  return names.filter((n) => n.startsWith('kuadrix-') && n !== CACHE.static);
}

export function cacheablePage(res: { status: number; redirected: boolean }): boolean {
  return res.status === 200 && !res.redirected;
}

export function pushPayload(text: string | null): { title: string; body: string; tag?: string; url: string } {
  let data: { title?: unknown; body?: unknown; tag?: unknown; url?: unknown } = {};
  if (text) {
    try {
      const parsed: unknown = JSON.parse(text);
      data = parsed && typeof parsed === 'object' ? parsed : { body: text };
    } catch {
      data = { body: text };
    }
  }
  const str = (v: unknown) => (typeof v === 'string' && v ? v : undefined);
  const out: { title: string; body: string; tag?: string; url: string } = {
    title: str(data.title) ?? 'Kuadrix',
    body: str(data.body) ?? '',
    url: str(data.url) ?? '/inicio',
  };
  const tag = str(data.tag);
  if (tag) out.tag = tag;
  return out;
}

export function notificationTarget(url: unknown, origin: string): string {
  let target: URL;
  try {
    target = new URL(typeof url === 'string' && url ? url : '/inicio', origin);
  } catch {
    target = new URL('/inicio', origin);
  }
  // Nunca navegar a otro origen: se abre la misma ruta + query en el origen propio.
  if (target.origin !== origin) target = new URL(target.pathname + target.search, origin);
  return target.href;
}
