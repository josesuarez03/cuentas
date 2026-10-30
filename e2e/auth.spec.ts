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
