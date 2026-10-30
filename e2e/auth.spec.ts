import { randomBytes } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { ANA, ANA_SALIR } from './support/fixtures';

test('sin sesión, el enlace de confirmar lleva al login con next', async ({ page }) => {
  await page.goto('/mes/2026-10?confirmar=e1');
  await expect(page).toHaveURL('/login?next=%2Fmes%2F2026-10%3Fconfirmar%3De1');
  await expect(page.getByRole('button', { name: 'Entrar con Google' })).toBeVisible();
});

test('sin sesión, / va a /login en un salto', async ({ page }) => {
  const res = await page.goto('/');
  await expect(page).toHaveURL('/login');
  expect(res!.request().redirectedFrom()?.redirectedFrom() ?? null).toBeNull();
});

test.describe('con datos', () => {
  test.use({ storageState: ANA });
  test('/ va a /inicio en un salto', async ({ page }) => {
    const res = await page.goto('/');
    await expect(page).toHaveURL('/inicio');
    expect(res!.request().redirectedFrom()?.url()).toMatch(/:3100\/$/);
    expect(res!.request().redirectedFrom()?.redirectedFrom() ?? null).toBeNull();
  });
});

test('PWA de iPhone: recoge la sesión con la que se entró en el navegador de Google (cookies aparte)', async ({ browser, baseURL }) => {
  const h = randomBytes(32).toString('base64url');
  // «PWA»: sin cookies, con el código guardado al tocar «Entrar con Google».
  const pwa = await browser.newContext({ baseURL });
  const app = await pwa.newPage();
  await app.goto('/login');
  await app.evaluate((code) => {
    sessionStorage.setItem('kuadrix:entrar', JSON.stringify({ h: code, next: '/inicio', startedAt: Date.now() }));
  }, h);
  expect((await app.request.post('/api/entrar/recoger', { data: { h } })).status()).toBe(404);

  // «Navegador superpuesto»: otro almacén de cookies, ya con la sesión de Ana tras volver de Google.
  const overlay = await browser.newContext({ baseURL, storageState: ANA });
  const google = await overlay.newPage();
  await google.goto(`/entrar/listo?h=${h}`);
  await expect(google.getByText('Has entrado. Toca ✕ arriba para volver a Kuadrix.')).toBeVisible();
  await expect(google).toHaveURL(`/entrar/listo?h=${h}`);

  // Al volver a la PWA, recoge la sesión y entra.
  await app.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(app).toHaveURL('/inicio');
  expect(await app.evaluate(() => sessionStorage.getItem('kuadrix:entrar'))).toBeNull();
  // El código es de un solo uso.
  expect((await app.request.post('/api/entrar/recoger', { data: { h } })).status()).toBe(404);
  await overlay.close();
  await pwa.close();
});

test('/entrar/listo con un código pero sin sesión no deja nada que recoger', async ({ page }) => {
  const h = randomBytes(32).toString('base64url');
  await page.goto(`/entrar/listo?h=${h}`);
  await expect(page.getByText('No se ha podido volver a la app. Cierra esta ventana y vuelve a entrar.')).toBeVisible();
  expect((await page.request.post('/api/entrar/recoger', { data: { h } })).status()).toBe(404);
});

test('/entrar/listo es pública y pide tocar ✕ sin cargar la app', async ({ page }) => {
  await page.goto('/entrar/listo');
  await expect(page.getByText('Has entrado. Toca ✕ arriba para volver a Kuadrix.')).toBeVisible();
  await expect(page).toHaveURL('/entrar/listo');
});

test.describe('cerrar sesión', () => {
  test.use({ storageState: ANA_SALIR });
  test('desde Ajustes va a /login y /inicio ya pide entrar', async ({ page }) => {
    await page.goto('/ajustes');
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(page).toHaveURL('/login');
    await expect(page.getByRole('button', { name: 'Entrar con Google' })).toBeVisible();
    await page.goto('/inicio');
    await expect(page).toHaveURL('/login?next=%2Finicio');
  });
});
