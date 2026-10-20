import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e', workers: 1, timeout: 120000, expect: { timeout: 15000 },
  outputDir: 'test-results', reporter: [['list'], ['json', { outputFile: 'docs/full-implementation/playwright-results.json' }]],
  use: { channel: 'msedge', headless: true, baseURL: 'http://127.0.0.1:5186', viewport: { width: 1440, height: 1000 }, timezoneId: 'Asia/Tokyo', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer: [
    { command: 'npm run dev:quiet', url: 'http://127.0.0.1:5186', reuseExistingServer: true, timeout: 300000 },
    { command: 'npm run build && npm run preview', url: 'http://127.0.0.1:5187', reuseExistingServer: true, timeout: 300000 },
  ],
});
