import { describe, expect, it } from 'vitest';
import { formatAmountInput, formatEuros, parseEuros } from './money';

const NBSP = '\u00A0';

describe('parseEuros', () => {
  it.each([
    ['1.870,00', 187000],
    ['1870', 187000],
    ['1.870', 187000],
    ['52,5', 5250],
    ['52.50', 5250],
    ['0,99', 99],
    [' 602 € ', 60200],
    ['1.234.567,8', 123456780],
  ])('%s → %i', (input, cents) => {
    expect(parseEuros(input)).toBe(cents);
  });

  it.each(['', 'abc', '-5', '1,2,3', '12,345', '1.87.0'])('rechaza «%s»', (input) => {
    expect(parseEuros(input)).toBeNull();
  });
});

describe('formatEuros', () => {
  it('agrupa miles siempre', () => {
    expect(formatEuros(187000)).toBe(`1.870,00${NBSP}€`);
    expect(formatEuros(123456780)).toBe(`1.234.567,80${NBSP}€`);
  });
  it('con signo usa + y \u2212 (U+2212)', () => {
    expect(formatEuros(5250, { sign: true })).toBe(`+52,50${NBSP}€`);
    expect(formatEuros(-63000, { sign: true })).toBe(`\u2212630,00${NBSP}€`);
  });
  it('sin signo solo marca negativos', () => {
    expect(formatEuros(-1200)).toBe(`\u221212,00${NBSP}€`);
  });
});

describe('formatAmountInput', () => {
  it('da el valor editable sin símbolo', () => {
    expect(formatAmountInput(5200)).toBe('52,00');
    expect(formatAmountInput(187000)).toBe('1.870,00');
  });
});
