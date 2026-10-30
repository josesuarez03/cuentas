'use client';

import { Bar, BarChart, XAxis } from 'recharts';
import { chartPoints } from '@/features/wealth/domain/chart';
import type { WealthPoint } from '@/features/wealth/domain/types';
import { formatMonthName } from '@/lib/year-month';
import { useMediaQuery } from '@/shared/hooks/use-media-query';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/shared/components/ui/chart';

const config = { euros: { label: 'Total', color: 'var(--serie-1)' } } satisfies ChartConfig;

export function WealthChart({ history }: { history: WealthPoint[] }) {
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const data = chartPoints(history);

  return (
    <section aria-labelledby="patrimonio-evolucion">
      <h2 id="patrimonio-evolucion" className="pb-2 text-[17px] leading-6 font-semibold">Evolución</h2>
      <ChartContainer config={config} className="h-40 w-full" aria-hidden>
        <BarChart data={data} accessibilityLayer={false}>
          <XAxis dataKey="label" tickLine={false} axisLine={false} />
          <Bar dataKey="euros" fill="var(--color-euros)" radius={4} isAnimationActive={!reduceMotion} />
          <ChartTooltip content={<ChartTooltipContent formatter={(_, __, item) => item.payload.text} />} />
        </BarChart>
      </ChartContainer>
      <table className="sr-only">
        <caption>Evolución del patrimonio</caption>
        <thead>
          <tr><th scope="col">Mes</th><th scope="col">Total</th></tr>
        </thead>
        <tbody>
          {data.map((p) => (
            <tr key={p.yearMonth}><th scope="row">{formatMonthName(p.yearMonth)}</th><td>{p.text}</td></tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
