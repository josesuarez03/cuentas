import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
    passWithNoTests: true,
    testTimeout: 60_000,
    // PGlite arranca una base nueva por test; con carga (agentes en paralelo, CI) tarda más de 10 s.
    hookTimeout: 60_000,
  },
});
