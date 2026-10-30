import { expect, test } from '@playwright/test';
import { NUEVO } from './support/fixtures';

test.describe.configure({ mode: 'serial' });
test.use({ storageState: NUEVO });

test('/ va a /primer-uso en un salto', async ({ page }) => {
  const res = await page.goto('/');
  await expect(page).toHaveURL('/primer-uso');
  expect(res!.request().redirectedFrom()?.url()).toMatch(/:3100\/$/);
  expect(res!.request().redirectedFrom()?.redirectedFrom() ?? null).toBeNull();
});

test('el asistente crea cuentas, nómina y partidas y lleva a Inicio', async ({ page }) => {
  await page.goto('/primer-uso');
  await page.getByLabel('Nombre de la cuenta').fill('BBVA');
  await page.getByLabel('Banco').fill('BBVA');
  await page.getByLabel('Saldo de hoy (€)').fill('1.000,00');
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await page.getByLabel('Neto al mes (€)').fill('1.870,00');
  await page.getByLabel('Día de cobro').fill('27');
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await page.getByLabel('Alquiler (€)').fill('800,00');
  await page.getByRole('button', { name: 'Empezar' }).click();
  await expect(page).toHaveURL('/inicio');
  await expect(page.getByText('1.070,00 €')).toBeVisible();
});
