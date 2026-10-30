import { formatIsoWeekdayDay } from '@/lib/iso-date';
import { formatEuros } from '@/lib/money';
import type { YearMonth } from '@/lib/year-month';
import type { DueReminder } from './due';

export interface EmailMessage {
  subject: string;
  text: string;
  html: string;
}

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag: string;
}

export function confirmUrl(baseUrl: string, ym: YearMonth, entryId: string): string {
  return `${baseUrl.replace(/\/$/, '')}/mes/${ym}?confirmar=${entryId}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const FOOTER = 'Puedes desactivar estos avisos en Kuadrix › Ajustes › Avisos.';

export function paydayEmail(r: DueReminder, url: string): EmailMessage {
  const amount = formatEuros(r.amountCents);
  const day = formatIsoWeekdayDay(r.paydayDate);
  const first = r.attempt === 1;
  const subject = first ? `${r.name}: hoy es el día de cobro` : `${r.name} sigue pendiente`;
  const intro = first
    ? `Hoy, ${day}, es el día de cobro previsto de ${r.name}: ${amount}.`
    : `Ayer, ${day}, era el día de cobro previsto de ${r.name} (${amount}) y sigue pendiente.`;
  const ask = first
    ? 'Cuando te llegue, confírmala con el importe real:'
    : 'Si ya te ha llegado, confírmala con el importe real:';
  const text = [intro, ask, url, '', FOOTER].join('\n');
  const html = [
    `<p>${escapeHtml(intro)}</p>`,
    `<p>${escapeHtml(ask)}</p>`,
    `<p><a href="${url}">Confirmar ${escapeHtml(r.name)}</a></p>`,
    `<p style="color:#666;font-size:13px">${escapeHtml(FOOTER)}</p>`,
  ].join('\n');
  return { subject, text, html };
}

export function paydayPush(r: DueReminder, url: string): PushPayload {
  const amount = formatEuros(r.amountCents);
  const first = r.attempt === 1;
  return {
    title: first ? `${r.name}: hoy es el día de cobro` : `${r.name} sigue pendiente`,
    body: first ? `Previsto: ${amount}. Toca para confirmar el importe.` : `Sigue pendiente (${amount}). Toca para confirmar.`,
    url,
    tag: `payday:${r.entryId}`,
  };
}
