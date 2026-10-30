import { afterEach, describe, expect, it, vi } from 'vitest';

const send = vi.hoisted(() => vi.fn());
vi.mock('resend', () => ({ Resend: vi.fn(function Resend() { return { emails: { send } }; }) }));
const { sendEmail } = await import('./email');
const msg = { subject: 'S', text: 'T', html: '<p>T</p>' };

afterEach(() => { vi.unstubAllEnvs(); send.mockReset(); });

describe('sendEmail', () => {
  it('sin clave no envía', async () => {
    vi.stubEnv('RESEND_API_KEY', '');
    expect(await sendEmail('a@b.es', msg)).toBe(false);
    expect(send).not.toHaveBeenCalled();
  });
  it('sin remitente no envía', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test');
    vi.stubEnv('EMAIL_FROM', '');
    expect(await sendEmail('a@b.es', msg)).toBe(false);
    expect(send).not.toHaveBeenCalled();
  });
  it('envía desde EMAIL_FROM', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test');
    vi.stubEnv('EMAIL_FROM', 'Kuadrix <avisos@kuadrix.dev>');
    send.mockResolvedValue({ data: { id: '1' }, error: null });
    expect(await sendEmail('a@b.es', msg)).toBe(true);
    expect(send).toHaveBeenCalledWith({ from: 'Kuadrix <avisos@kuadrix.dev>', to: 'a@b.es', subject: 'S', text: 'T', html: '<p>T</p>' });
  });
  it('error de Resend o excepción → false', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test');
    vi.stubEnv('EMAIL_FROM', 'Kuadrix <avisos@kuadrix.dev>');
    send.mockResolvedValueOnce({ data: null, error: { message: 'no' } }).mockRejectedValueOnce(new Error('red'));
    expect(await sendEmail('a@b.es', msg)).toBe(false);
    expect(await sendEmail('a@b.es', msg)).toBe(false);
    expect(send.mock.calls[0][0].from).toBe('Kuadrix <avisos@kuadrix.dev>');
  });
});
