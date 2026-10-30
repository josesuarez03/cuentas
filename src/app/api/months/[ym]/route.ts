import { db } from '@/db';
import { addMonths, currentYearMonth, isYearMonth } from '@/lib/year-month';
import { monthStartsWithin } from '@/features/month/domain/upcoming';
import { getUpcoming } from '@/features/month/server/upcoming';
import { getCatalog } from '@/features/catalog/server/catalog';
import { rollMonth } from '@/features/month/server/lifecycle';
import { getMonthView } from '@/features/month/server/months';
import { getUserOrNull } from '@/features/auth/session';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ ym: string }> }) {
  const user = await getUserOrNull();
  if (!user) return Response.json({ error: 'Inicia sesión para continuar.' }, { status: 401 });

  const { ym } = await params;
  if (!isYearMonth(ym)) return Response.json({ error: 'Mes no válido.' }, { status: 400 });

  const current = currentYearMonth();
  if (ym > current) return Response.json({ error: 'Este mes aún no ha empezado.' }, { status: 404 });
  if (ym === current) await rollMonth(db, user.id, current);

  const view = await getMonthView(db, user.id, ym);
  if (!view) return Response.json({ error: 'No hay datos de este mes.' }, { status: 404 });

  const upcoming = ym === current ? await getUpcoming(db, user.id, addMonths(ym, 1)) : null;
  const later = addMonths(ym, 2);
  const upcomingLater = ym === current && monthStartsWithin(later, 60) ? await getUpcoming(db, user.id, later) : null;
  return Response.json({ view, catalog: await getCatalog(db, user.id), upcoming, upcomingLater });
}
