import { test, expect } from './fixture';

test('settings dialog opens when clicking the settings button', async ({ launched }) => {
  const { page } = launched;
  await page.click('#settings-btn');
  await expect(page.locator('#settings-dialog')).toBeVisible();
});

test('cancel button closes the settings dialog', async ({ launched }) => {
  const { page } = launched;
  await page.click('#settings-btn');
  await expect(page.locator('#settings-dialog')).toBeVisible();
  await page.click('#settings-cancel');
  await expect(page.locator('#settings-dialog')).not.toBeVisible();
});

test('close (X) button closes the settings dialog', async ({ launched }) => {
  const { page } = launched;
  await page.click('#settings-btn');
  await page.click('#settings-close');
  await expect(page.locator('#settings-dialog')).not.toBeVisible();
});

test('changing theme to light applies data-theme="light"', async ({ launched }) => {
  const { page } = launched;
  await page.click('#settings-btn');
  await page.selectOption('#settings-theme', 'light');
  await page.click('#settings-save');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('changing theme to dark applies data-theme="dark"', async ({ launched }) => {
  const { page } = launched;
  await page.click('#settings-btn');
  await page.selectOption('#settings-theme', 'dark');
  await page.click('#settings-save');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('shortcut recorder captures pressed key combinations', async ({ launched }) => {
  const { page } = launched;
  await page.click('#settings-btn');
  await page.click('#shortcut-new-note');
  await page.keyboard.press('Control+Shift+G');
  await expect(page.locator('#shortcut-new-note')).toHaveAttribute(
    'data-accel',
    'CmdOrCtrl+Shift+G',
  );
});

test('reset button restores the default shortcut', async ({ launched }) => {
  const { page } = launched;
  await page.click('#settings-btn');
  await page.click('#shortcut-new-note');
  await page.keyboard.press('Control+Shift+G');
  await expect(page.locator('#shortcut-new-note')).toHaveAttribute(
    'data-accel',
    'CmdOrCtrl+Shift+G',
  );

  await page.click('button[data-reset="newNote"]');
  await expect(page.locator('#shortcut-new-note')).toHaveAttribute(
    'data-accel',
    'CmdOrCtrl+N',
  );
});

test('saving duplicate shortcuts shows an error and keeps dialog open', async ({ launched }) => {
  const { page } = launched;
  await page.click('#settings-btn');
  await page.click('#shortcut-new-note');
  await page.keyboard.press('Control+F');
  await expect(page.locator('#shortcut-new-note')).toHaveAttribute(
    'data-accel',
    'CmdOrCtrl+F',
  );

  await page.click('#settings-save');
  await expect(page.locator('#settings-error')).toContainText(
    'Two or more shortcuts use the same key combination',
  );
  await expect(page.locator('#settings-dialog')).toBeVisible();
});
