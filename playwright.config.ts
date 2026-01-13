import { defineConfig, devices } from '@playwright/test';
import { loadConfig } from './config_helper';

const cfg = loadConfig();

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: cfg.jira.baseUrl,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'Project Name', //My Project Name
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
