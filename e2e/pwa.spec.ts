import { expect, test, type Page } from '@playwright/test';
import { ANA, readE2eData } from './support/fixtures';

// Espera explícita a que el service worker haya guardado estas URL (no `networkidle`: el SW mantiene la red ocupada).
async function expectCached(page: Page, paths: string[]) {
  await expect
    .poll(() => page.evaluate(async (ps) => (await Promise.all(ps.map((p) => caches.match(p)))).every(Boolean), paths))
    .toBe(true);
}

test('manifest instalable y sus iconos sin sesión', async ({ request }) => {
  const res = await request.get('/manifest.webmanifest', { maxRedirects: 0 });
  expect(res.status()).toBe(200);
  const m = await res.json();
  expect(m).toMatchObject({ name: 'Kuadrix', short_name: 'Kuadrix', start_url: '/inicio', display: 'standalone', lang: 'es' });
  expect(m.icons.map((i: { purpose: string }) => i.purpose)).toEqual(['any', 'any', 'maskable']);
  for (const src of [...m.icons.map((i: { src: string }) => i.src), '/apple-icon.png']) {
    const r = await request.get(src, { maxRedirects: 0 });
    expect(r.status(), src).toBe(200);
    expect(r.headers()['content-type'], src).toBe('image/png');
  }
});

test.describe('con sesión', () => {
  test.use({ storageState: ANA });

  test('registra el service worker y controla la página', async ({ page }) => {
    await page.goto('/inicio');
    expect(await page.evaluate(async () => (await navigator.serviceWorker.ready).active?.scriptURL)).toMatch(/\/serwist\/sw\.js$/);
    await page.reload();
    expect(await page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);
  });

  test('con el service worker activo, un importe editado sigue al recargar', async ({ page }) => {
    await page.goto('/mes');
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await page.getByRole('button', { name: /^Piso/ }).click();
    await page.getByRole('button', { name: 'Editar importe de Alquiler' }).click();
    await page.getByRole('textbox', { name: 'Importe de Alquiler' }).fill('910,00');
    const saved = page.waitForResponse((r) => r.request().method() === 'POST' && !!r.request().headers()['next-action']);
    await page.keyboard.press('Enter');
    expect((await saved).ok()).toBe(true);
    await expect(page.getByRole('button', { name: 'Editar importe de Alquiler' })).toContainText('910,00');
    await page.reload();
    await page.getByRole('button', { name: /^Piso/ }).click();
    await expect(page.getByRole('button', { name: 'Editar importe de Alquiler' })).toContainText('910,00');
  });

  test('sin conexión: últimos datos, aviso y edición desactivada', async ({ page, context }) => {
    const { ym } = readE2eData();
    for (const p of ['/inicio', '/mes', '/ajustes']) {
      await page.goto(p);
      await page.evaluate(() => navigator.serviceWorker.ready);
    }
    await page.goto('/inicio'); // ya controlada por el SW: guarda la pantalla y sus lecturas
    await expectCached(page, ['/inicio', '/mes', '/ajustes', `/api/months/${ym}`, '/api/settings']);

    await context.setOffline(true);
    await page.goto('/inicio');
    await expect(page.getByRole('status').filter({ hasText: 'Sin conexión' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Disponible para ahorrar' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Añadir al mes' })).toBeDisabled();

    await page.goto('/mes');
    await page.getByRole('button', { name: /^Piso/ }).click();
    await expect(page.getByRole('button', { name: 'Editar importe de Alquiler' })).toHaveCount(0);

    await page.goto('/ajustes');
    await expect(page.getByRole('switch', { name: 'Avisos por correo' })).toBeDisabled();

    await page.goto('/patrimonio'); // nunca visitada en este contexto
    await expect(page.getByRole('heading', { name: 'Sin conexión' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Volver a Inicio' })).toBeVisible();
    await context.setOffline(false);
  });
});
