import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';

config({ path: 'e2e/e2e.env', override: true, quiet: true });

export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  globalSetup: './e2e/global-setup.ts',
  use: {
    ...devices['Pixel 7'],
    viewport: { width: 390, height: 844 },
    baseURL: 'http://localhost:3100',
    locale: 'es-ES',
    timezoneId: 'Europe/Madrid',
    trace: 'retain-on-failure',
  },
  webServer: { command: 'pnpm start -p 3100', url: 'http://localhost:3100/login', reuseExistingServer: !process.env.CI, timeout: 120_000 },
});
