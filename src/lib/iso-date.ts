export type IsoDate = string; // 'YYYY-MM-DD'

const DAY_MS = 86_400_000;

function toUtc(d: IsoDate): number {
  const [y, m, day] = d.split('-').map(Number);
  return Date.UTC(y, m - 1, day);
}

export function todayIso(now: Date = new Date(), timeZone = 'Europe/Madrid'): IsoDate {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function addDays(d: IsoDate, n: number): IsoDate {
  return new Date(toUtc(d) + n * DAY_MS).toISOString().slice(0, 10);
}

/** `to − from` en días naturales. */
export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((toUtc(to) - toUtc(from)) / DAY_MS);
}

/** `'jueves 24'` */
export function formatIsoWeekdayDay(d: IsoDate): string {
  return new Intl.DateTimeFormat('es-ES', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
  }).format(new Date(toUtc(d)));
}
