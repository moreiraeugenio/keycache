import { test, expect, addNote } from './fixture';

test('window opens and shows empty state', async ({ launched }) => {
  const { page } = launched;
  const emptyState = page.locator('#empty-state');
  await expect(emptyState).toBeVisible();
  await expect(emptyState).toContainText('No notes yet');
});

test('add a note via modal', async ({ launched }) => {
  const { page } = launched;
  await page.click('#add-btn');
  await expect(page.locator('#form-dialog')).toBeVisible();

  await page.fill('#key-input', 'TEST_KEY');
  await page.fill('#value-input', 'test_value');
  await page.click('#submit-btn');

  await expect(page.locator('.note-key')).toHaveText('TEST_KEY');
  await expect(page.locator('.note-value')).toHaveText('test_value');
});

test('edit a note', async ({ launched }) => {
  const { page } = launched;
  await addNote(page, 'ORIGINAL', 'original_value');

  await page.click('[aria-label="Edit ORIGINAL"]');
  await expect(page.locator('#form-heading')).toHaveText('Edit Note');

  await page.fill('#key-input', 'UPDATED');
  await page.fill('#value-input', 'updated_value');
  await page.click('#submit-btn');

  await expect(page.locator('.note-key')).toHaveText('UPDATED');
  await expect(page.locator('.note-value')).toHaveText('updated_value');
});

test('delete a note with confirmation', async ({ launched }) => {
  const { page } = launched;
  await addNote(page, 'TO_DELETE', 'delete_me');

  await page.click('[aria-label="Delete TO_DELETE"]');
  await expect(page.locator('#confirm-dialog')).toBeVisible();
  await expect(page.locator('#delete-key-name')).toHaveText('TO_DELETE');

  await page.click('#dialog-confirm');

  await expect(page.locator('#empty-state')).toBeVisible();
});

test('search filters notes by key', async ({ launched }) => {
  const { page } = launched;
  await addNote(page, 'API_KEY', 'key1');
  await addNote(page, 'DB_HOST', 'localhost');

  await expect(page.locator('.note-row')).toHaveCount(2);

  await page.fill('#search-input', 'API');
  await expect(page.locator('.note-row')).toHaveCount(1);
  await expect(page.locator('.note-key')).toHaveText('API_KEY');

  await page.fill('#search-input', '');
  await expect(page.locator('.note-row')).toHaveCount(2);
});
