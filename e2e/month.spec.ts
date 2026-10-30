import { expect, test } from '@playwright/test';
import { ANA, readE2eData } from './support/fixtures';

test.use({ storageState: ANA });

test('editar un importe: se ve al momento y sigue al recargar', async ({ page }) => {
  await page.route('**/*', async (route) => {
    if (route.request().method() === 'POST' && route.request().headers()['next-action']) await new Promise((r) => setTimeout(r, 1500));
    await route.continue();
  });
  await page.goto('/mes');
  await page.getByRole('button', { name: /^Piso/ }).click();
  await page.getByRole('button', { name: 'Editar importe de Alquiler' }).click();
  await page.getByRole('textbox', { name: 'Importe de Alquiler' }).fill('850,00');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Editar importe de Alquiler' })).toContainText('850,00', { timeout: 800 }); // optimista: antes de que responda el servidor
  await page.waitForLoadState('networkidle');
  await page.unroute('**/*');
  await page.reload();
  await page.getByRole('button', { name: /^Piso/ }).click();
  await expect(page.getByRole('button', { name: 'Editar importe de Alquiler' })).toContainText('850,00');
});

test('confirmar la nómina desde el enlace con el neto real', async ({ page }) => {
  const { ym, nominaEntryId } = readE2eData();
  await page.goto(`/mes/${ym}?confirmar=${nominaEntryId}`);
  await expect(page.getByRole('dialog', { name: 'Confirmar Nómina' })).toBeVisible();
  const importe = page.getByRole('textbox', { name: 'Importe recibido (€)' });
  await expect(importe).toHaveValue('1.870,00');
  await importe.fill('1.790,00');
  await page.getByRole('button', { name: 'Confirmar' }).click();
  await expect(page.getByText('Nómina confirmada.')).toBeVisible();
  await expect(page).toHaveURL('/mes');
  await page.goto(`/mes/${ym}?confirmar=${nominaEntryId}`);
  await expect(page.getByText('Nómina ya está confirmada.')).toBeVisible();
});
