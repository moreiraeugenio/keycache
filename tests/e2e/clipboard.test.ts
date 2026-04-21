import { test, expect, addNote } from './fixture';

test('toast confirms a note was added', async ({ launched }) => {
  const { page } = launched;
  await page.click('#add-btn');
  await page.fill('#key-input', 'TOAST_ADD');
  await page.fill('#value-input', 'val');
  await page.click('#submit-btn');

  await expect(page.locator('.toast')).toContainText('Note added');
});

test('toast confirms a note was updated', async ({ launched }) => {
  const { page } = launched;
  await addNote(page, 'EDIT_ME', 'v1');

  await page.click('[aria-label="Edit EDIT_ME"]');
  await page.fill('#value-input', 'v2');
  await page.click('#submit-btn');

  await expect(page.locator('.toast')).toContainText('Note updated');
});

test('toast confirms a note was deleted', async ({ launched }) => {
  const { page } = launched;
  await addNote(page, 'DEL_ME', 'v');

  await page.click('[aria-label="Delete DEL_ME"]');
  await page.click('#dialog-confirm');

  await expect(page.locator('.toast')).toContainText('Note deleted');
});

test('clicking a note row copies the value and shows a copied toast', async ({ launched }) => {
  const { page, app } = launched;
  await addNote(page, 'COPY_KEY', 'copy_value');

  await page.click('.note-key');

  await expect
    .poll(() => app.evaluate(({ clipboard }) => clipboard.readText()))
    .toBe('copy_value');
  await expect(page.locator('.toast')).toContainText('Copied "COPY_KEY" to clipboard');
});

test('clicking the edit button does not trigger the copy toast', async ({ launched }) => {
  const { page } = launched;
  await addNote(page, 'EDIT_ONLY', 'value');

  await page.click('[aria-label="Edit EDIT_ONLY"]');
  await expect(page.locator('#form-dialog')).toBeVisible();

  await expect(page.locator('.toast')).not.toContainText('Copied');
});

test('clicking the delete button does not trigger the copy toast', async ({ launched }) => {
  const { page } = launched;
  await addNote(page, 'DEL_ONLY', 'value');

  await page.click('[aria-label="Delete DEL_ONLY"]');
  await expect(page.locator('#confirm-dialog')).toBeVisible();

  await expect(page.locator('.toast')).not.toContainText('Copied');
});
