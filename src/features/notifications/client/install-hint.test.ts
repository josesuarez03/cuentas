import { describe, expect, it } from 'vitest';
import { PUSH_HINT_TEXT, pushHint } from './install-hint';

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1';
const IPAD = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15';
const FIREFOX = 'Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0';

describe('pushHint (solo se pregunta cuando no hay push)', () => {
  it('iPhone en Safari sin instalar: cómo instalar', () => {
    expect(pushHint({ userAgent: IPHONE, maxTouchPoints: 5, standalone: false })).toBe('ios-install');
  });
  it('iPad con iPadOS cuenta como iOS', () => {
    expect(pushHint({ userAgent: IPAD, maxTouchPoints: 5, standalone: false })).toBe('ios-install');
  });
  it('Mac de escritorio no es iOS', () => {
    expect(pushHint({ userAgent: IPAD, maxTouchPoints: 0, standalone: false })).toBe('unsupported');
  });
  it('iOS ya instalada sin PushManager: versión antigua', () => {
    expect(pushHint({ userAgent: IPHONE, maxTouchPoints: 5, standalone: true })).toBe('ios-old');
  });
  it('otros navegadores sin push', () => {
    expect(pushHint({ userAgent: FIREFOX, maxTouchPoints: 0, standalone: false })).toBe('unsupported');
  });
  it('textos', () => {
    expect(PUSH_HINT_TEXT['ios-install']).toBe('En iPhone, los avisos push llegan con Kuadrix instalada. Añádela a la pantalla de inicio desde Compartir → Añadir a pantalla de inicio (iOS 16.4+) y ábrela desde el icono. Mientras, te avisamos por correo.');
  });
});
