export type YearMonth = string;

const PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isYearMonth(s: string): boolean {
  return PATTERN.test(s);
}

function toIndex(ym: YearMonth): number {
  const [y, m] = ym.split('-').map(Number);
  return y * 12 + (m - 1);
}

function fromIndex(i: number): YearMonth {
  const y = Math.floor(i / 12);
  const m = (i % 12) + 1;
  return `${y}-${String(m).padStart(2, '0')}`;
}

export function addMonths(ym: YearMonth, n: number): YearMonth {
  return fromIndex(toIndex(ym) + n);
}

export function diffMonths(a: YearMonth, b: YearMonth): number {
  return toIndex(a) - toIndex(b);
}

export function monthOf(ym: YearMonth): number {
  return Number(ym.slice(5, 7));
}

export function currentYearMonth(now: Date = new Date(), timeZone = 'Europe/Madrid'): YearMonth {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit' }).formatToParts(now);
  const year = parts.find((p) => p.type === 'year')!.value;
  const month = parts.find((p) => p.type === 'month')!.value;
  return `${year}-${month}`;
}

const monthName = new Intl.DateTimeFormat('es-ES', { month: 'long', timeZone: 'UTC' });

export function formatMonthName(ym: YearMonth): string {
  const [y, m] = ym.split('-').map(Number);
  const name = monthName.format(new Date(Date.UTC(y, m - 1, 1)));
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${y}`;
}
