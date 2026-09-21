import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  timeout: 60000,
  retries: 2,
  // One worker on Windows. The app is a tray popup that hides itself on blur,
  // and two instances sharing one Windows desktop steal focus from each other:
  // when one worker launches its app, the other's window blurs, hides, and
  // stops rendering, so its next click waits forever for an element that will
  // never become visible. Linux under xvfb has no window manager to move focus,
  // and on macOS the accessory app doesn't take focus when shown, so both keep
  // running in parallel.
  workers: process.platform === 'win32' ? 1 : 2,
  use: {
    trace: 'on-first-retry',
  },
});
