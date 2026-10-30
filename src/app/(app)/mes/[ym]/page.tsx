import { notFound } from 'next/navigation';
import { MonthScreen } from '@/features/month/components/month-screen';
import { isYearMonth } from '@/lib/year-month';

export const metadata = { title: 'Mes · Kuadrix' };

export default async function MesPorFechaPage({ params, searchParams }: {
  params: Promise<{ ym: string }>;
  searchParams: Promise<{ confirmar?: string }>;
}) {
  const { ym } = await params;
  const { confirmar } = await searchParams;
  if (!isYearMonth(ym)) notFound();
  const entryId = typeof confirmar === 'string' && /^[0-9a-f-]{36}$/i.test(confirmar) ? confirmar : null;
  return <MonthScreen initialYm={ym} confirmEntryId={entryId} />;
}
