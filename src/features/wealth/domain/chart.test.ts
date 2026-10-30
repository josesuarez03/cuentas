import { describe, expect, it } from 'vitest';
import { chartPoints } from './chart';

describe('chartPoints', () => {
  it('etiqueta corta del mes, euros para el eje y texto es-ES', () => {
    expect(chartPoints([{ yearMonth: '2026-09', totalCents: 1423640 }, { yearMonth: '2026-10', totalCents: -5000 }])).toEqual([
      { yearMonth: '2026-09', label: 'sep', euros: 14236.4, text: '14.236,40\u00A0€' },
      { yearMonth: '2026-10', label: 'oct', euros: -50, text: '−50,00\u00A0€' },
    ]);
  });
});
