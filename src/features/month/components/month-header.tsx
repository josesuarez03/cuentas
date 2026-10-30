'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { currentYearMonth, formatMonthName } from '@/lib/year-month';
import { useMonthStore } from '@/features/month/store/month-store';

export function MonthHeader() {
  const ym = useMonthStore((s) => s.ym);
  const shift = useMonthStore((s) => s.shift);
  const isCurrent = ym >= currentYearMonth();
  return (
    <header className="flex items-center justify-center gap-1 px-4 pt-3 pb-1">
      <Button variant="ghost" size="icon" className="size-11 text-ink-muted" aria-label="Mes anterior" onClick={() => shift(-1)}>
        <ChevronLeft className="size-5" />
      </Button>
      <h1 className="min-w-44 text-center text-xl leading-[26px] font-semibold">{formatMonthName(ym)}</h1>
      <Button variant="ghost" size="icon" className="size-11 text-ink-muted" aria-label="Mes siguiente" disabled={isCurrent} onClick={() => shift(1)}>
        <ChevronRight className="size-5" />
      </Button>
    </header>
  );
}
