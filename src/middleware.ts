import { getSessionCookie } from 'better-auth/cookies';
import { NextResponse, type NextRequest } from 'next/server';

// Comprobación rápida de cookie; la validación real está en requireUser/getUserOrNull.
export function middleware(request: NextRequest) {
  if (getSessionCookie(request)) {
    // Ruta actual para que requireUser conserve el destino si la cookie existe pero la sesión no vale.
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-next-path', request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Inicia sesión para continuar.' }, { status: 401 });
  }
  const url = new URL('/login', request.url);
  const next = request.nextUrl.pathname + request.nextUrl.search;
  if (next !== '/') url.searchParams.set('next', next);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!login(?:/|$)|sin-conexion(?:/|$)|entrar/listo(?:/|$)|api/auth|api/cron(?:/|$)|serwist/|sw\\.js$|manifest\\.webmanifest$|icons/|icon\\.png$|apple-icon\\.png$|_vercel/|_next/static|_next/image|favicon.ico).*)'],
};
