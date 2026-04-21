import { test, expect, addNote } from './fixture';

test('ArrowDown and ArrowUp navigate the note list', async ({ launched }) => {
  const { page } = launched;
  await addNote(page, 'FIRST', '1');
  await addNote(page, 'SECOND', '2');

  await page.click('#search-input');
  await expect(page.locator('.note-row').nth(0)).toHaveClass(/selected/);

  await page.keyboard.press('ArrowDown');
  await expect(page.locator('.note-row').nth(1)).toHaveClass(/selected/);
  await expect(page.locator('.note-row').nth(0)).not.toHaveClass(/selected/);

  await page.keyboard.press('ArrowUp');
  await expect(page.locator('.note-row').nth(0)).toHaveClass(/selected/);
});

test('ArrowDown wraps from last back to first', async ({ launched }) => {
  const { page } = launched;
  await addNote(page, 'FIRST', '1');
  await addNote(page, 'SECOND', '2');

  await page.click('#search-input');
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('.note-row').nth(1)).toHaveClass(/selected/);
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('.note-row').nth(0)).toHaveClass(/selected/);
});

test('ArrowUp wraps from first back to last', async ({ launched }) => {
  const { page } = launched;
  await addNote(page, 'FIRST', '1');
  await addNote(page, 'SECOND', '2');

  await page.click('#search-input');
  await expect(page.locator('.note-row').nth(0)).toHaveClass(/selected/);
  await page.keyboard.press('ArrowUp');
  await expect(page.locator('.note-row').nth(1)).toHaveClass(/selected/);
});

test('Enter in search copies the selected note value to clipboard', async ({ launched }) => {
  const { page, app } = launched;
  await addNote(page, 'MY_KEY', 'secret_value');

  await page.click('#search-input');
  await page.keyboard.press('Enter');

  await expect
    .poll(() => app.evaluate(({ clipboard }) => clipboard.readText()))
    .toBe('secret_value');
});

test('Escape closes the form dialog', async ({ launched }) => {
  const { page } = launched;
  await page.click('#add-btn');
  await expect(page.locator('#form-dialog')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.locator('#form-dialog')).not.toBeVisible();
});

test('Escape closes the delete confirmation dialog', async ({ launched }) => {
  const { page } = launched;
  await addNote(page, 'TO_DELETE', 'x');
  await page.click('[aria-label="Delete TO_DELETE"]');
  await expect(page.locator('#confirm-dialog')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.locator('#confirm-dialog')).not.toBeVisible();
});

test('clicking the main area refocuses the search input', async ({ launched }) => {
  const { page } = launched;
  await addNote(page, 'NOTE', 'val');

  await page.locator('#add-btn').focus();
  await expect(page.locator('#search-input')).not.toBeFocused();

  await page.locator('.main').dispatchEvent('mousedown');
  await expect(page.locator('#search-input')).toBeFocused();
});
