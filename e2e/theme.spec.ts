import { expect, test } from '@playwright/test';
import { ANA } from './support/fixtures';

test.describe('esquema oscuro del sistema', () => {
  test.use({ colorScheme: 'dark' });
  test('/login arranca en oscuro', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('html')).toHaveClass(/\bdark\b/);
  });
});

test.describe('esquema claro del sistema', () => {
  test.use({ colorScheme: 'light' });
  test('/login arranca en claro con dos theme-color', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('html')).not.toHaveClass(/\bdark\b/);
    await expect(page.locator('meta[name="theme-color"]')).toHaveCount(2);
  });
});

test.describe('elegir tema en Ajustes', () => {
  test.use({ storageState: ANA, colorScheme: 'light' });
  test('Oscuro se aplica y sobrevive a recargar', async ({ page }) => {
    await page.goto('/ajustes');
    await page.getByRole('radio', { name: 'Oscuro' }).click();
    await expect(page.locator('html')).toHaveClass(/\bdark\b/);
    await page.reload();
    await expect(page.locator('html')).toHaveClass(/\bdark\b/);
  });
});
