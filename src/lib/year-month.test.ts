import { describe, expect, it } from 'vitest';
import { addMonths, currentYearMonth, diffMonths, formatMonthName, formatMonthNameOnly, formatShortDate, formatWeekdayDay, isYearMonth, monthOf, startOfMonth } from './year-month';

describe('year-month', () => {
  it('valida el formato', () => {
    expect(isYearMonth('2026-11')).toBe(true);
    expect(isYearMonth('2026-13')).toBe(false);
    expect(isYearMonth('2026-1')).toBe(false);
  });
  it('suma y resta meses cruzando años', () => {
    expect(addMonths('2026-11', 2)).toBe('2027-01');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
  });
  it('calcula la diferencia en meses', () => {
    expect(diffMonths('2027-01', '2026-11')).toBe(2);
    expect(diffMonths('2026-10', '2026-11')).toBe(-1);
  });
  it('devuelve el número de mes', () => {
    expect(monthOf('2027-03')).toBe(3);
  });
  it('usa la hora de Madrid', () => {
    // 31/10/2026 23:30 UTC = 1/11/2026 00:30 en Madrid (horario de invierno)
    expect(currentYearMonth(new Date('2026-10-31T23:30:00Z'))).toBe('2026-11');
  });
  it('nombra el mes en español', () => {
    expect(formatMonthName('2026-11')).toBe('Noviembre 2026');
  });
  it('escribe el día de la semana y el día en Madrid', () => {
    expect(formatWeekdayDay(new Date('2026-10-30T12:00:00Z'))).toBe('viernes 30');
    // 31/10/2026 23:30 UTC = domingo 1/11 00:30 en Madrid
    expect(formatWeekdayDay(new Date('2026-10-31T23:30:00Z'))).toBe('domingo 1');
  });
  it('nombra solo el mes, en minúscula', () => {
    expect(formatMonthNameOnly('2026-12')).toBe('diciembre');
    expect(formatMonthNameOnly('2027-01')).toBe('enero');
  });
  it('el mes empieza a medianoche de Madrid (invierno y verano)', () => {
    expect(startOfMonth('2026-11').toISOString()).toBe('2026-10-31T23:00:00.000Z');
    expect(startOfMonth('2026-07').toISOString()).toBe('2026-06-30T22:00:00.000Z');
    expect(startOfMonth('2027-01').toISOString()).toBe('2026-12-31T23:00:00.000Z');
  });
  it('fecha corta en Madrid', () => {
    expect(formatShortDate(new Date('2026-10-12T10:00:00Z'))).toBe('12 oct');
    expect(formatShortDate(new Date('2026-10-31T23:30:00Z'))).toBe('1 nov');
  });
});
