import { expect, test, type Page } from '@playwright/test';
import { ANA } from './support/fixtures';

test.use({ storageState: ANA });

async function expectDialogFits(page: Page) {
  const viewport = page.viewportSize()!;
  const dialog = page.getByRole('dialog', { name: 'Editar partida' });
  await expect(dialog).toBeVisible();
  const box = (await dialog.boundingBox())!;
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);

  // «Tipo» arriba del todo se ve entero.
  const tipo = (await dialog.getByText('Tipo', { exact: true }).boundingBox())!;
  expect(tipo.y).toBeGreaterThanOrEqual(box.y);

  // El mes no se sale por la derecha.
  const month = (await dialog.getByLabel('Empieza en').boundingBox())!;
  expect(month.x + month.width).toBeLessThanOrEqual(box.x + box.width);

  // Tras bajar el cuerpo del formulario, «Guardar» queda dentro de la pantalla.
  await dialog.getByTestId('recurring-form-body').evaluate((el) => { el.scrollTop = el.scrollHeight; });
  const save = dialog.getByRole('button', { name: 'Guardar' });
  await expect(save).toBeInViewport({ ratio: 1 });
  const saveBox = (await save.boundingBox())!;
  expect(saveBox.y + saveBox.height).toBeLessThanOrEqual(Math.min(viewport.height, box.y + box.height));
}

for (const viewport of [{ width: 390, height: 844 }, { width: 375, height: 667 }]) {
  test(`editar una partida recurrente cabe en pantalla (${viewport.width}×${viewport.height})`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/ajustes');
    await page.getByRole('button', { name: 'Editar Nómina' }).click();
    await expectDialogFits(page);
  });
}

test('buscar partida filtra sin acentos y avisa si no hay ninguna', async ({ page }) => {
  await page.goto('/ajustes');
  const search = page.getByRole('searchbox', { name: 'Buscar partida' });
  await search.fill('NOMINA');
  await expect(page.getByRole('button', { name: 'Editar Nómina' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Editar Alquiler' })).toHaveCount(0);
  await search.fill('gimnasio');
  await expect(page.getByText('Ninguna partida coincide con «gimnasio».')).toBeVisible();
  await search.press('Escape');
  await expect(page.getByRole('button', { name: 'Editar Alquiler' })).toBeVisible();
});
