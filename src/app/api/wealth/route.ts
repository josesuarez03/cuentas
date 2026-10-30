import { db } from '@/db';
import { getUserOrNull } from '@/features/auth/session';
import { getWealth } from '@/features/wealth/server/wealth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getUserOrNull();
  if (!user) return Response.json({ error: 'Inicia sesión para continuar.' }, { status: 401 });
  return Response.json(await getWealth(db, user.id));
}
