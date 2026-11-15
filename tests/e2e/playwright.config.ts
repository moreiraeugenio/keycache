import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  timeout: 60000,
  retries: 2,
  // One worker on Windows and Linux. The app is a tray popup that hides itself
  // on blur, and two instances sharing one desktop steal focus from each other:
  // when one worker launches its app, the other's window blurs, hides, and
  // stops rendering, so its next click waits forever for an element that will
  // never become visible. Linux is no exception even under xvfb with no window
  // manager: Electron sets X input focus itself when a window is shown. On
  // macOS the accessory app doesn't take focus when shown, so it keeps two.
  workers: process.platform === 'darwin' ? 2 : 1,
  use: {
    trace: 'on-first-retry',
  },
});
