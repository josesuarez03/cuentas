import { Resend } from 'resend';
import type { EmailMessage } from '../domain/messages';

export async function sendEmail(to: string, msg: EmailMessage): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) {
    console.warn('Correo no configurado: faltan RESEND_API_KEY o EMAIL_FROM.');
    return false;
  }
  try {
    const { error } = await new Resend(key).emails.send({ from, to, subject: msg.subject, text: msg.text, html: msg.html });
    if (error) console.error(error);
    return !error;
  } catch (e) {
    console.error(e);
    return false;
  }
}
