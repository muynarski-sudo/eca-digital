import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: 'e2e',
  timeout: 60000,
  retries: 0,
  use: { baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000', trace: 'off' },
  projects: [{ name: 'chromium', use: { ...devices['Pixel 7'] } }],
  webServer: process.env.E2E_NO_SERVER ? undefined : { command: 'npm run dev', url: 'http://localhost:3000', reuseExistingServer: true, timeout: 120000 },
});
