const THOUSANDS = /^\d{1,3}(\.\d{3})+$/;

export function parseEuros(input: string): number | null {
  const s = input.replace(/[\s €]/g, '');
  if (!/^\d[\d.,]*$/.test(s)) return null;

  let normalized: string;
  if (s.includes(',')) {
    const parts = s.split(',');
    if (parts.length !== 2) return null;
    const [intPart, dec] = parts;
    if (dec.length === 0 || dec.length > 2) return null;
    if (intPart.includes('.') && !THOUSANDS.test(intPart)) return null;
    normalized = `${intPart.replace(/\./g, '')}.${dec}`;
  } else if (s.includes('.')) {
    if (THOUSANDS.test(s)) normalized = s.replace(/\./g, '');
    else if (/^\d+\.\d{1,2}$/.test(s)) normalized = s;
    else return null;
  } else {
    normalized = s;
  }
  return Math.round(Number(normalized) * 100);
}

// `useGrouping: 'always'` hace que 1870 salga como 1.870 (es-ES no agrupa 4 cifras por defecto).
const GROUPING = 'always' as unknown as boolean;
const currency = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', useGrouping: GROUPING });
const plain = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: GROUPING });

export function formatEuros(cents: number, opts: { sign?: boolean } = {}): string {
  const abs = currency.format(Math.abs(cents) / 100);
  if (cents < 0) return `−${abs}`;
  return opts.sign ? `+${abs}` : abs;
}

export function formatAmountInput(cents: number): string {
  return plain.format(cents / 100);
}
