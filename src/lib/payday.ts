// Solo servidor: date-holidays incluye datos de todos los países.
import Holidays from 'date-holidays';
import { addDays, type IsoDate } from './iso-date';
import type { YearMonth } from './year-month';

export type PaydayRule = 'before' | 'after';

const cache = new Map<string, Set<IsoDate>>();

function holidaysOf(region: string, year: number): Set<IsoDate> {
  const key = `${region}:${year}`;
  let set = cache.get(key);
  if (!set) {
    const [country, state] = region.split('-');
    const hd = state ? new Holidays(country, state) : new Holidays(country);
    set = new Set(hd.getHolidays(year).filter((h) => h.type === 'public').map((h) => h.date.slice(0, 10)));
    cache.set(key, set);
  }
  return set;
}

export function isHoliday(d: IsoDate, region: string): boolean {
  return holidaysOf(region, Number(d.slice(0, 4))).has(d);
}

function isNonWorking(d: IsoDate, region: string): boolean {
  const [y, m, day] = d.split('-').map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, day)).getUTCDay();
  return weekday === 0 || weekday === 6 || isHoliday(d, region);
}

export function paydayDate(ym: YearMonth, day: number, rule: PaydayRule = 'before', region = 'ES-MD'): IsoDate {
  const [y, m] = ym.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  let d: IsoDate = `${ym}-${String(Math.min(day, last)).padStart(2, '0')}`;
  const step = rule === 'before' ? -1 : 1;
  for (let i = 0; i < 15 && isNonWorking(d, region); i++) d = addDays(d, step);
  return d;
}
