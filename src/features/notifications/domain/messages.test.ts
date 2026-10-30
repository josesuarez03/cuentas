import { describe, expect, it } from 'vitest';
import type { DueReminder } from './due';
import { confirmUrl, paydayEmail, paydayPush } from './messages';

const r: DueReminder = { kind: 'payday', attempt: 1, refKey: 'payday:r1:2026-12:1', entryId: 'e1', recurringItemId: 'r1', name: 'Nómina', amountCents: 187000, yearMonth: '2026-12', paydayDate: '2026-12-24' };
const url = confirmUrl('https://kuadrix-eight.vercel.app/', '2026-12', 'e1');

describe('mensajes de nómina', () => {
  it('enlace de confirmar sin barras dobles', () => {
    expect(url).toBe('https://kuadrix-eight.vercel.app/mes/2026-12?confirmar=e1');
  });
  it('correo del día de cobro', () => {
    const m = paydayEmail(r, url);
    expect(m.subject).toBe('Nómina: hoy es el día de cobro');
    expect(m.text).toBe([
      'Hoy, jueves 24, es el día de cobro previsto de Nómina: 1.870,00 €.',
      'Cuando te llegue, confírmala con el importe real:',
      url,
      '',
      'Puedes desactivar estos avisos en Kuadrix › Ajustes › Avisos.',
    ].join('\n'));
    expect(m.html).toContain(`<a href="${url}">Confirmar Nómina</a>`);
  });
  it('recordatorio del día siguiente', () => {
    const m = paydayEmail({ ...r, attempt: 2 }, url);
    expect(m.subject).toBe('Nómina sigue pendiente');
    expect(m.text.split('\n')[0]).toBe('Ayer, jueves 24, era el día de cobro previsto de Nómina (1.870,00 €) y sigue pendiente.');
    expect(m.text.split('\n')[1]).toBe('Si ya te ha llegado, confírmala con el importe real:');
  });
  it('escapa el nombre en el HTML', () => {
    expect(paydayEmail({ ...r, name: 'Extra <b>' }, url).html).toContain('Extra &lt;b&gt;');
  });
  it('push: mismo título, texto corto y etiqueta por entrada (el segundo sustituye al primero)', () => {
    expect(paydayPush(r, url)).toEqual({ title: 'Nómina: hoy es el día de cobro', body: 'Previsto: 1.870,00 €. Toca para confirmar el importe.', url, tag: 'payday:e1' });
    expect(paydayPush({ ...r, attempt: 2 }, url).body).toBe('Sigue pendiente (1.870,00 €). Toca para confirmar.');
  });
});
