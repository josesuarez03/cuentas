import { db } from '@/db';
import { isAllowedEmail } from '@/features/auth/allowlist';
import { auth } from '@/features/auth/auth';
import { HANDOFF_TTL_MS, readHandoffCode, saveHandoff } from '@/features/auth/handoff';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Desde el navegador donde se acaba de entrar con Google: deja la sesión lista para la PWA.
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  // Solo una sesión recién creada (la de entrar con Google en esta ventana): así, abrir un
  // enlace /entrar/listo?h=… ajeno con la sesión ya abierta no le cede la sesión a quien lo creó.
  const fresh = session && Date.now() - new Date(session.session.createdAt).getTime() <= HANDOFF_TTL_MS;
  if (!session || !fresh || !isAllowedEmail(session.user.email)) {
    return Response.json({ error: 'Inicia sesión para continuar.' }, { status: 401 });
  }
  const h = await readHandoffCode(request);
  if (!h) return Response.json({ error: 'Código no válido.' }, { status: 400 });
  // Llamada de servidor (sin `request`): la permite disableClientRequest.
  const { token } = await auth.api.generateOneTimeToken({ headers: request.headers });
  await saveHandoff(db, h, token);
  return new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });
}
