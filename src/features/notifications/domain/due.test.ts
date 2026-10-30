import { describe, expect, it } from 'vitest';
import { duePaydayReminders, type PaydayCandidate } from './due';

const nomina: PaydayCandidate = { entryId: 'e1', recurringItemId: 'r1', name: 'Nómina', amountCents: 187000, yearMonth: '2026-12', paydayDate: '2026-12-24' };

describe('duePaydayReminders (spec 6)', () => {
  it('el día de cobro: primer aviso', () => {
    expect(duePaydayReminders([nomina], '2026-12-24')).toEqual([{ ...nomina, kind: 'payday', attempt: 1, refKey: 'payday:r1:2026-12:1' }]);
  });
  it('el día siguiente: un único recordatorio', () => {
    expect(duePaydayReminders([nomina], '2026-12-25').map((r) => r.refKey)).toEqual(['payday:r1:2026-12:2']);
  });
  it('antes ni dos días después: nada', () => {
    expect(duePaydayReminders([nomina], '2026-12-23')).toEqual([]);
    expect(duePaydayReminders([nomina], '2026-12-26')).toEqual([]);
  });
});
