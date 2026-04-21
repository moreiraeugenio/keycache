import fs from 'fs';
import os from 'os';
import path from 'path';
import { test, expect, addNote, launchApp, closeApp } from './fixture';

test('visibility toggle masks and unmasks every note value', async ({ launched }) => {
  const { page } = launched;
  await addNote(page, 'A', 'alpha');
  await addNote(page, 'B', 'bravo');

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

test('visibility state persists across app restart', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'keycache-e2e-persist-'));
  const dataFilePath = path.join(tmpDir, 'notes.json');
  const settingsFilePath = path.join(tmpDir, 'settings.json');

  const first = await launchApp({ tmpDir, dataFilePath, settingsFilePath });
  await addNote(first.page, 'SECRET', 'hidden_value');
  await first.page.click('#visibility-btn');
  await expect(first.page.locator('.note-value')).toHaveClass(/masked/);
  await closeApp(first, false);

  const second = await launchApp({ tmpDir, dataFilePath, settingsFilePath });
  try {
    await expect(second.page.locator('.note-value')).toHaveClass(/masked/);
    await expect(second.page.locator('.note-value')).toHaveText('\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022');
  } finally {
    await closeApp(second, true);
  }
});
