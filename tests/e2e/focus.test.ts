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

test('Cmd+N then typed-key flow refocuses search after save', async ({ launched }) => {
  const { page } = launched;
  await page.click('#search-input');

  await page.keyboard.press('Control+n');
  await expect(page.locator('#form-dialog')).toBeVisible();

  await page.keyboard.type('TYPED_KEY');
  await page.keyboard.press('Tab');
  await page.keyboard.type('typed_value');
  await page.keyboard.press('Enter');

  await expect(page.locator('.note-key')).toHaveText('TYPED_KEY');
  await expect(page.locator('#search-input')).toBeFocused();
});

test('Cmd+N from existing notes list refocuses search after save', async ({ launched }) => {
  const { page } = launched;
  await addNote(page, 'EXISTING_A', 'a');
  await addNote(page, 'EXISTING_B', 'b');

  await page.click('#search-input');
  await page.keyboard.press('Control+n');
  await expect(page.locator('#form-dialog')).toBeVisible();

  await page.keyboard.type('NEW_THIRD');
  await page.keyboard.press('Tab');
  await page.keyboard.type('third_value');
  await page.keyboard.press('Enter');

  await expect(page.locator('.note-row')).toHaveCount(3);
  await expect(page.locator('#search-input')).toBeFocused();
});

test('Cmd+N when search has text refocuses search after save', async ({ launched }) => {
  const { page } = launched;
  await addNote(page, 'API_KEY', 'a');

  await page.click('#search-input');
  await page.keyboard.type('API');
  await page.keyboard.press('Control+n');
  await expect(page.locator('#form-dialog')).toBeVisible();

  await page.keyboard.type('NEW_KEY');
  await page.keyboard.press('Tab');
  await page.keyboard.type('new_value');
  await page.keyboard.press('Enter');

  await expect(page.locator('#search-input')).toBeFocused();
});

test('Cmd+N then Tab to submit button + Enter refocuses search', async ({ launched }) => {
  const { page } = launched;
  await page.click('#search-input');

  await page.keyboard.press('Control+n');
  await expect(page.locator('#form-dialog')).toBeVisible();

  await page.keyboard.type('TAB_KEY');
  await page.keyboard.press('Tab');
  await page.keyboard.type('tab_value');
  await page.keyboard.press('Tab'); // to cancel
  await page.keyboard.press('Tab'); // to submit
  await expect(page.locator('#submit-btn')).toBeFocused();
  await page.keyboard.press('Enter');

  await expect(page.locator('.note-key')).toHaveText('TAB_KEY');
  await expect(page.locator('#search-input')).toBeFocused();
});

test('Cmd+N from a row click refocuses search after save', async ({ launched }) => {
  const { page } = launched;
  await addNote(page, 'EXISTING', 'val');

  // Move focus away from search by interacting with toolbar buttons
  await page.locator('#add-btn').focus();
  await page.keyboard.press('Control+n');
  await expect(page.locator('#form-dialog')).toBeVisible();

  await page.keyboard.type('NEW_ONE');
  await page.keyboard.press('Tab');
  await page.keyboard.type('new_val');
  await page.keyboard.press('Enter');

  await expect(page.locator('.note-row')).toHaveCount(2);
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
