import { describe, expect, it } from 'vitest';
import { isHoliday, paydayDate } from './payday';

describe('paydayDate (5.3)', () => {
  it('ejemplo de la spec: 27/12/2026 domingo → 26 sábado → 25 Navidad → 24 jueves', () => {
    expect(paydayDate('2026-12', 27, 'before')).toBe('2026-12-24');
  });
  it('regla «después»: 27/12/2026 → lunes 28', () => {
    expect(paydayDate('2026-12', 27, 'after')).toBe('2026-12-28');
  });
  it('día laborable: se queda', () => {
    expect(paydayDate('2026-10', 27)).toBe('2026-10-27');
  });
  it('festivo autonómico de Madrid (2 de mayo) solo cuenta con ES-MD', () => {
    expect(paydayDate('2025-05', 2, 'before', 'ES-MD')).toBe('2025-04-30'); // 2 vie (Madrid) → 1 jue (Trabajo) → 30 mié
    expect(paydayDate('2025-05', 2, 'before', 'ES')).toBe('2025-05-02');
  });
  it('día sustituto de Madrid: lunes 7/12/2026 (Constitución en domingo)', () => {
    expect(paydayDate('2026-12', 7, 'before')).toBe('2026-12-04');
    expect(paydayDate('2026-12', 7, 'after')).toBe('2026-12-09');   // 8 Inmaculada
  });
  it('Semana Santa: 3/4/2026 Viernes Santo y 2 Jueves Santo', () => {
    expect(paydayDate('2026-04', 3, 'before')).toBe('2026-04-01');
    expect(paydayDate('2026-04', 2, 'after')).toBe('2026-04-06');
  });
  it('cruza el año hacia atrás y hacia delante', () => {
    expect(paydayDate('2027-01', 1, 'before')).toBe('2026-12-31');
    expect(paydayDate('2027-01', 1, 'after')).toBe('2027-01-04');
    expect(paydayDate('2028-12', 31, 'after')).toBe('2029-01-02');
  });
  it('días que el mes no tiene: se usa el último día', () => {
    expect(paydayDate('2026-11', 31, 'before')).toBe('2026-11-30');
    expect(paydayDate('2027-02', 31, 'before')).toBe('2027-02-26');
    expect(paydayDate('2027-02', 31, 'after')).toBe('2027-03-01');
  });
  it('sale del mes si hace falta: 2/11/2026 sustituto de Todos los Santos', () => {
    expect(paydayDate('2026-11', 2, 'before')).toBe('2026-10-30');
  });
});

describe('isHoliday', () => {
  it('solo festivos «public», no celebraciones', () => {
    expect(isHoliday('2026-12-25', 'ES-MD')).toBe(true);
    expect(isHoliday('2026-05-03', 'ES-MD')).toBe(false); // Día de la Madre (observance)
    expect(isHoliday('2026-12-24', 'ES-MD')).toBe(false);
  });
});
