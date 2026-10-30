import { db } from '@/db';
import { auth } from '@/features/auth/auth';
import { readHandoffCode, takeHandoff } from '@/features/auth/handoff';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const notFound = () =>
  Response.json({ error: 'Todavía no hay sesión para este código.' }, { status: 404, headers: { 'cache-control': 'no-store' } });

// Desde la PWA, sin sesión: canjea el código por la cookie de sesión.
export async function POST(request: Request) {
  const h = await readHandoffCode(request);
  if (!h) return Response.json({ error: 'Código no válido.' }, { status: 400 });
  const token = await takeHandoff(db, h);
  if (!token) return notFound();
  let cookies: string[];
  try {
    const { headers } = await auth.api.verifyOneTimeToken({ body: { token }, headers: request.headers, returnHeaders: true });
    cookies = headers.getSetCookie();
  } catch {
    return notFound();
  }
  const res = new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });
  for (const c of cookies) res.headers.append('set-cookie', c);
  return res;
}
