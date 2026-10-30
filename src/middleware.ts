import { getSessionCookie } from 'better-auth/cookies';
import { NextResponse, type NextRequest } from 'next/server';

// Comprobación rápida de cookie; la validación real está en requireUser/getUserOrNull.
export function middleware(request: NextRequest) {
  if (getSessionCookie(request)) return NextResponse.next();
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Inicia sesión para continuar.' }, { status: 401 });
  }
  return NextResponse.redirect(new URL('/login', request.url));
}

export const config = {
  matcher: ['/((?!login(?:/|$)|api/auth|_next/static|_next/image|favicon.ico).*)'],
};
