import { test as base, type ElectronApplication, type Page } from '@playwright/test';
import { _electron as electron } from 'playwright';
import path from 'path';
import fs from 'fs';
import os from 'os';

const projectRoot = path.join(__dirname, '..', '..');

export interface LaunchedApp {
  app: ElectronApplication;
  page: Page;
  dataFilePath: string;
  settingsFilePath: string;
  tmpDir: string;
}

export interface LaunchOptions {
  dataFilePath?: string;
  settingsFilePath?: string;
  tmpDir?: string;
}

export async function launchApp(opts: LaunchOptions = {}): Promise<LaunchedApp> {
  const tmpDir = opts.tmpDir ?? fs.mkdtempSync(path.join(os.tmpdir(), 'keycache-e2e-'));
  const dataFilePath = opts.dataFilePath ?? path.join(tmpDir, 'notes.json');
  const settingsFilePath = opts.settingsFilePath ?? path.join(tmpDir, 'settings.json');

  const app = await electron.launch({
    args: [projectRoot],
    env: {
      ...process.env,
      NODE_ENV: 'test',
      KEYCACHE_DATA_FILE_PATH: dataFilePath,
      KEYCACHE_SETTINGS_FILE_PATH: settingsFilePath,
    },
  });
  const page = await app.firstWindow();
  await app.evaluate(({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win && !win.isVisible()) win.show();
  });
  await page.waitForLoadState('domcontentloaded');
  return { app, page, dataFilePath, settingsFilePath, tmpDir };
}

export async function closeApp(launched: LaunchedApp, cleanup = true): Promise<void> {
  await launched.app.close();
  if (cleanup) fs.rmSync(launched.tmpDir, { recursive: true, force: true });
}

export const test = base.extend<{ launched: LaunchedApp }>({
  launched: async ({}, use) => {
    const launched = await launchApp();
    await use(launched);
    await closeApp(launched);
  },
});

export { expect } from '@playwright/test';

export async function addNote(page: Page, key: string, value: string): Promise<void> {
  await page.click('#add-btn');
  await page.fill('#key-input', key);
  await page.fill('#value-input', value);
  await page.click('#submit-btn');
  await page.waitForSelector(`[aria-label="Edit ${key}"]`);
}
