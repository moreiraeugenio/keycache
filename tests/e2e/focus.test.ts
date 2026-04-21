import { test, expect, addNote } from './fixture';

test('saving a new note via keyboard returns focus to search', async ({ launched }) => {
  const { page } = launched;
  await page.click('#search-input');

  await page.keyboard.press('Control+n');
  await expect(page.locator('#form-dialog')).toBeVisible();

  await page.fill('#key-input', 'KB_KEY');
  await page.fill('#value-input', 'kb_value');
  await page.locator('#value-input').press('Enter');

  await expect(page.locator('.note-key')).toHaveText('KB_KEY');
  await expect(page.locator('#search-input')).toBeFocused();
});

test('saving an edited note via keyboard returns focus to search', async ({ launched }) => {
  const { page } = launched;
  await addNote(page, 'EDIT_ME', 'before');

  await page.click('[aria-label="Edit EDIT_ME"]');
  await page.fill('#value-input', 'after');
  await page.locator('#value-input').press('Enter');

  await expect(page.locator('.note-value')).toHaveText('after');
  await expect(page.locator('#search-input')).toBeFocused();
});

test('saving a note via the submit button returns focus to search', async ({ launched }) => {
  const { page } = launched;
  await page.click('#add-btn');
  await page.fill('#key-input', 'CLICK_KEY');
  await page.fill('#value-input', 'click_value');
  await page.click('#submit-btn');

  await expect(page.locator('.note-key')).toHaveText('CLICK_KEY');
  await expect(page.locator('#search-input')).toBeFocused();
});

test('cancelling the new-note form returns focus to search', async ({ launched }) => {
  const { page } = launched;
  await page.click('#add-btn');
  await page.click('#cancel-btn');

  await expect(page.locator('#search-input')).toBeFocused();
});

test('closing the form with X returns focus to search', async ({ launched }) => {
  const { page } = launched;
  await page.click('#add-btn');
  await page.click('#form-close');

  await expect(page.locator('#search-input')).toBeFocused();
});

test('Escape on the form returns focus to search', async ({ launched }) => {
  const { page } = launched;
  await page.click('#add-btn');
  await page.keyboard.press('Escape');

  await expect(page.locator('#search-input')).toBeFocused();
});

test('confirming a delete returns focus to search', async ({ launched }) => {
  const { page } = launched;
  await addNote(page, 'DELETE_ME', 'gone');

  await page.click('[aria-label="Delete DELETE_ME"]');
  await page.click('#dialog-confirm');

  await expect(page.locator('#empty-state')).toBeVisible();
  await expect(page.locator('#search-input')).toBeFocused();
});

test('cancelling a delete returns focus to search', async ({ launched }) => {
  const { page } = launched;
  await addNote(page, 'KEEP_ME', 'stay');

  await page.click('[aria-label="Delete KEEP_ME"]');
  await page.click('#dialog-cancel');

  await expect(page.locator('#search-input')).toBeFocused();
});

test('Escape on the confirm dialog returns focus to search', async ({ launched }) => {
  const { page } = launched;
  await addNote(page, 'KEEP_ME', 'stay');

  await page.click('[aria-label="Delete KEEP_ME"]');
  await page.keyboard.press('Escape');

  await expect(page.locator('#search-input')).toBeFocused();
});

test('closing settings via Cmd+, returns focus to search', async ({ launched }) => {
  const { page } = launched;
  await page.click('#search-input');
  await page.keyboard.press('Control+,');
  await expect(page.locator('#settings-dialog')).toBeVisible();

  await page.keyboard.press('Control+,');
  await expect(page.locator('#settings-dialog')).not.toBeVisible();
  await expect(page.locator('#search-input')).toBeFocused();
});

test('Escape on the settings dialog returns focus to search', async ({ launched }) => {
  const { page } = launched;
  await page.click('#search-input');
  await page.keyboard.press('Control+,');
  await expect(page.locator('#settings-dialog')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.locator('#settings-dialog')).not.toBeVisible();
  await expect(page.locator('#search-input')).toBeFocused();
});

test('cancelling settings via the Cancel button returns focus to search', async ({ launched }) => {
  const { page } = launched;
  await page.click('#settings-btn');
  await expect(page.locator('#settings-dialog')).toBeVisible();

  await page.click('#settings-cancel');
  await expect(page.locator('#search-input')).toBeFocused();
});

test('toggling value visibility via shortcut keeps focus on search', async ({ launched }) => {
  const { page } = launched;
  await addNote(page, 'TOGGLE_KEY', 'val');

  await page.click('#search-input');
  await page.keyboard.press('Control+Shift+H');

  await expect(page.locator('#search-input')).toBeFocused();
});
