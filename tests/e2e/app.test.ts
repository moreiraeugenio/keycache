import { test, expect, type ElectronApplication, type Page } from '@playwright/test';
import { _electron as electron } from 'playwright';
import path from 'path';
import fs from 'fs';
import os from 'os';

const projectRoot = path.join(__dirname, '..', '..');

let app: ElectronApplication;
let page: Page;
let testDbPath: string;

test.beforeEach(async () => {
  // Create an isolated temp DB for each test
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'keycache-e2e-'));
  testDbPath = path.join(tmpDir, 'notes.json');

  app = await electron.launch({
    args: [projectRoot],
    env: {
      ...process.env,
      NODE_ENV: 'test',
      KEYCACHE_DB_PATH: testDbPath,
    },
  });
  page = await app.firstWindow();
  // Window starts hidden in tray mode — show it for testing
  await app.evaluate(({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win && !win.isVisible()) win.show();
  });
  await page.waitForLoadState('domcontentloaded');
});

test.afterEach(async () => {
  await app.close();
  // Clean up temp DB files
  const tmpDir = path.dirname(testDbPath);
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('window opens and shows empty state', async () => {
  const emptyState = page.locator('#empty-state');
  await expect(emptyState).toBeVisible();
  await expect(emptyState).toContainText('No notes yet');
});

test('add a note via modal', async () => {
  await page.click('#add-btn');
  await expect(page.locator('#form-dialog')).toBeVisible();

  await page.fill('#key-input', 'TEST_KEY');
  await page.fill('#value-input', 'test_value');
  await page.click('#submit-btn');

  // Note should appear in the list
  await expect(page.locator('.note-key')).toHaveText('TEST_KEY');
  await expect(page.locator('.note-value')).toHaveText('test_value');
});

test('edit a note', async () => {
  // Add a note first
  await page.click('#add-btn');
  await page.fill('#key-input', 'ORIGINAL');
  await page.fill('#value-input', 'original_value');
  await page.click('#submit-btn');
  await expect(page.locator('.note-key')).toHaveText('ORIGINAL');

  // Click edit
  await page.click('[aria-label="Edit ORIGINAL"]');
  await expect(page.locator('#form-heading')).toHaveText('Edit Note');

  // Change the value
  await page.fill('#key-input', 'UPDATED');
  await page.fill('#value-input', 'updated_value');
  await page.click('#submit-btn');

  // Verify changes
  await expect(page.locator('.note-key')).toHaveText('UPDATED');
  await expect(page.locator('.note-value')).toHaveText('updated_value');
});

test('delete a note with confirmation', async () => {
  // Add a note first
  await page.click('#add-btn');
  await page.fill('#key-input', 'TO_DELETE');
  await page.fill('#value-input', 'delete_me');
  await page.click('#submit-btn');
  await expect(page.locator('.note-key')).toHaveText('TO_DELETE');

  // Click delete
  await page.click('[aria-label="Delete TO_DELETE"]');
  await expect(page.locator('#confirm-dialog')).toBeVisible();
  await expect(page.locator('#delete-key-name')).toHaveText('TO_DELETE');

  // Confirm deletion
  await page.click('#dialog-confirm');

  // Note should be gone, empty state should show
  await expect(page.locator('#empty-state')).toBeVisible();
});

test('search filters notes by key', async () => {
  // Add two notes
  await page.click('#add-btn');
  await page.fill('#key-input', 'API_KEY');
  await page.fill('#value-input', 'key1');
  await page.click('#submit-btn');

  await page.click('#add-btn');
  await page.fill('#key-input', 'DB_HOST');
  await page.fill('#value-input', 'localhost');
  await page.click('#submit-btn');

  await expect(page.locator('.note-row')).toHaveCount(2);

  // Search for "API"
  await page.fill('#search-input', 'API');
  await expect(page.locator('.note-row')).toHaveCount(1);
  await expect(page.locator('.note-key')).toHaveText('API_KEY');

  // Clear search
  await page.fill('#search-input', '');
  await expect(page.locator('.note-row')).toHaveCount(2);
});

test('visibility toggle masks and unmasks every note value', async () => {
  await page.click('#add-btn');
  await page.fill('#key-input', 'A');
  await page.fill('#value-input', 'alpha');
  await page.click('#submit-btn');

  await page.click('#add-btn');
  await page.fill('#key-input', 'B');
  await page.fill('#value-input', 'bravo');
  await page.click('#submit-btn');

  const values = page.locator('.note-value');
  await expect(values).toHaveCount(2);
  await expect(values.first()).not.toHaveClass(/masked/);

  await page.click('#visibility-btn');
  for (const v of await values.all()) {
    await expect(v).toHaveClass(/masked/);
    await expect(v).toHaveText('\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022');
  }

  await page.click('#visibility-btn');
  await expect(values.first()).not.toHaveClass(/masked/);
  await expect(values.first()).toHaveText(/alpha|bravo/);
});

test('cancel button closes form without saving', async () => {
  await page.click('#add-btn');
  await page.fill('#key-input', 'UNSAVED');
  await page.fill('#value-input', 'data');
  await page.click('#cancel-btn');

  // No note should be added
  await expect(page.locator('#empty-state')).toBeVisible();
});

test('toast appears on note actions', async () => {
  // Add a note and check for toast
  await page.click('#add-btn');
  await page.fill('#key-input', 'TOAST_TEST');
  await page.fill('#value-input', 'val');
  await page.click('#submit-btn');

  const toast = page.locator('.toast');
  await expect(toast).toBeVisible();
  await expect(toast).toContainText('Note added');
});
