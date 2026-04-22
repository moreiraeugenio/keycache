import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  timeout: 30000,
  retries: 2,
  workers: 2,
  use: {
    trace: 'on-first-retry',
  },
});
