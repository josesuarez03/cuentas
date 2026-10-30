const fs = require('node:fs');

const state = JSON.parse(fs.readFileSync('e2e/.auth/ana.json', 'utf8')); // lo escribe el global-setup de Playwright
const Cookie = state.cookies.map((c) => `${c.name}=${c.value}`).join('; ');
const base = 'http://localhost:3100';

module.exports = {
  ci: {
    collect: {
      startServerCommand: 'pnpm start -p 3100',
      startServerReadyPattern: 'Ready',
      url: ['/login', '/inicio', '/mes', '/patrimonio', '/ajustes'].map((p) => base + p),
      numberOfRuns: 3,
      settings: { extraHeaders: { Cookie }, chromeFlags: '--no-sandbox' },
    },
    assert: {
      assertions: {
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'categories:performance': ['warn', { minScore: 0.85 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 2500 }],
      },
    },
    upload: { target: 'filesystem', outputDir: '.lighthouseci' },
  },
};
