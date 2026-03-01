const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'cd server && npm start',
      port: 3000,
      reuseExistingServer: true,
      timeout: 15000,
    },
    {
      command: 'cd client && npm run dev',
      port: 5173,
      reuseExistingServer: true,
      timeout: 15000,
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
});
