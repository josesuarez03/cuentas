import { describe, expect, it } from 'vitest';
import { addDays, daysBetween, formatIsoWeekdayDay, todayIso } from './iso-date';

describe('iso-date', () => {
  it('hoy en Madrid, no en UTC (horario de invierno y de verano)', () => {
    expect(todayIso(new Date('2026-10-31T22:30:00Z'))).toBe('2026-10-31'); // 23:30 en Madrid
    expect(todayIso(new Date('2026-10-31T23:30:00Z'))).toBe('2026-11-01'); // 00:30 en Madrid
    expect(todayIso(new Date('2026-06-30T22:30:00Z'))).toBe('2026-07-01'); // 00:30, UTC+2
  });
  it('suma días y cruza meses y años', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2027-03-01', -1)).toBe('2027-02-28');
  });
  it('días entre fechas, con signo, sin saltos por el cambio de hora', () => {
    expect(daysBetween('2026-12-21', '2026-12-24')).toBe(3);
    expect(daysBetween('2026-12-24', '2026-12-21')).toBe(-3);
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2);
  });
  it('día de la semana y número en español', () => {
    expect(formatIsoWeekdayDay('2026-12-24')).toBe('jueves 24');
    expect(formatIsoWeekdayDay('2026-10-27')).toBe('martes 27');
  });
});
