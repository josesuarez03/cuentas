import { describe, expect, it } from 'vitest';
import { buildWealth, estimateAt, flowOfEntry, type AccountRef } from './estimate';

const principal: AccountRef = { id: 'p', name: 'BBVA principal', type: 'checking' };
const tarjeta: AccountRef = { id: 't', name: 'Tarjeta BBVA', type: 'credit_card' };
const d = (iso: string) => new Date(iso);
const NOW = d('2026-10-30T12:00:00Z');

describe('flowOfEntry', () => {
  const base = { accountId: 'p', amountCents: 1000, createdAt: d('2026-10-01T00:00:00Z'), confirmedAt: null };
  it('ingreso pendiente no cuenta; confirmado cuenta en su fecha de confirmación', () => {
    expect(flowOfEntry({ ...base, kind: 'income', status: 'pending' })).toBeNull();
    expect(flowOfEntry({ ...base, kind: 'income', status: 'confirmed', confirmedAt: d('2026-10-27T08:00:00Z') }))
      .toEqual({ accountId: 'p', cents: 1000, at: d('2026-10-27T08:00:00Z') });
    expect(flowOfEntry({ ...base, kind: 'income', status: 'confirmed' })!.at).toEqual(base.createdAt);
  });
  it('gastos y préstamos restan; los cobros suman', () => {
    expect(flowOfEntry({ ...base, kind: 'expense', status: null })!.cents).toBe(-1000);
    expect(flowOfEntry({ ...base, kind: 'loan_out', status: null })!.cents).toBe(-1000);
    expect(flowOfEntry({ ...base, kind: 'loan_repayment', status: null })!.cents).toBe(1000);
  });
});

describe('estimateAt', () => {
  it('real + flujos posteriores al saldo y no posteriores a «at»', () => {
    const rows = estimateAt([principal], [
      { accountId: 'p', balanceCents: 100000, date: d('2026-09-10T00:00:00Z') },
      { accountId: 'p', balanceCents: 200000, date: d('2026-10-15T00:00:00Z') },
    ], [
      { accountId: 'p', cents: -5000, at: d('2026-10-01T00:00:00Z') }, // antes del saldo: fuera
      { accountId: 'p', cents: 187000, at: d('2026-10-27T00:00:00Z') },
      { accountId: 'p', cents: -999, at: d('2026-11-02T00:00:00Z') },  // después de «at»: fuera
    ], NOW);
    expect(rows[0].snapshot!.balanceCents).toBe(200000);
    expect(rows[0].estimatedCents).toBe(387000);
  });
  it('sin saldo: null', () => {
    expect(estimateAt([principal], [], [{ accountId: 'p', cents: 5, at: NOW }], NOW)[0].estimatedCents).toBeNull();
  });
});

describe('buildWealth', () => {
  const snapshots = [
    { accountId: 'p', balanceCents: 300000, date: d('2026-09-20T00:00:00Z') },
    { accountId: 't', balanceCents: -40000, date: d('2026-10-20T00:00:00Z') },
  ];
  it('la tarjeta resta del total y la diferencia es estimado − real', () => {
    const w = buildWealth({ accounts: [principal, tarjeta], snapshots, flows: [{ accountId: 'p', cents: -10000, at: d('2026-10-05T00:00:00Z') }], loans: [], now: NOW });
    expect(w.totalCents).toBe(290000 - 40000);
    expect(w.accounts[0]).toMatchObject({ realCents: 300000, estimatedCents: 290000, diffCents: -10000, stale: true });
    expect(w.accounts[1]).toMatchObject({ estimatedCents: -40000, diffCents: 0, stale: false });
  });
  it('variación null si una cuenta no tenía saldo al empezar el mes', () => {
    const w = buildWealth({ accounts: [principal, tarjeta], snapshots, flows: [], loans: [], now: NOW });
    expect(w.variationCents).toBeNull();
    expect(w.previousYearMonth).toBe('2026-09');
  });
  it('variación desde el inicio del mes cuando todas son comparables', () => {
    const w = buildWealth({ accounts: [principal], snapshots: [snapshots[0]], flows: [{ accountId: 'p', cents: 187000, at: d('2026-10-27T00:00:00Z') }], loans: [], now: NOW });
    expect(w.variationCents).toBe(187000);
  });
  it('sin saldos: total 0, sin variación ni historia y sin NaN', () => {
    const w = buildWealth({ accounts: [principal], snapshots: [], flows: [], loans: [], now: NOW });
    expect(w).toMatchObject({ totalCents: 0, variationCents: null, history: [] });
    expect(w.accounts[0]).toMatchObject({ realCents: null, estimatedCents: null, diffCents: null, stale: false });
  });
  it('historia de hasta 6 meses, saltando los que no tienen datos', () => {
    const w = buildWealth({ accounts: [principal], snapshots: [snapshots[0]], flows: [], loans: [], now: NOW });
    expect(w.history).toEqual([{ yearMonth: '2026-09', totalCents: 300000 }, { yearMonth: '2026-10', totalCents: 300000 }]);
  });
  it('30 días justos no es «sin actualizar»; 31 sí', () => {
    const at = (days: number) => buildWealth({ accounts: [principal], snapshots: [{ accountId: 'p', balanceCents: 1, date: new Date(NOW.getTime() - days * 86_400_000) }], flows: [], loans: [], now: NOW }).accounts[0].stale;
    expect(at(30)).toBe(false);
    expect(at(31)).toBe(true);
  });
});
