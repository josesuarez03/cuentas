import { db } from '@/db';
import { isAllowedEmail } from '@/features/auth/allowlist';
import { auth } from '@/features/auth/auth';
import { readHandoffCode, saveHandoff } from '@/features/auth/handoff';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Desde el navegador donde se acaba de entrar con Google: deja la sesión lista para la PWA.
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session || !isAllowedEmail(session.user.email)) {
    return Response.json({ error: 'Inicia sesión para continuar.' }, { status: 401 });
  }
  const h = await readHandoffCode(request);
  if (!h) return Response.json({ error: 'Código no válido.' }, { status: 400 });
  // Llamada de servidor (sin `request`): la permite disableClientRequest.
  const { token } = await auth.api.generateOneTimeToken({ headers: request.headers });
  await saveHandoff(db, h, token);
  return new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });
}
