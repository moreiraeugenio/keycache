import { test, expect, addNote } from './fixture';

test('cancel button closes form without saving', async ({ launched }) => {
  const { page } = launched;
  await page.click('#add-btn');
  await page.fill('#key-input', 'UNSAVED');
  await page.fill('#value-input', 'data');
  await page.click('#cancel-btn');

  await expect(page.locator('#empty-state')).toBeVisible();
});

test('close (X) button closes form without saving', async ({ launched }) => {
  const { page } = launched;
  await page.click('#add-btn');
  await page.fill('#key-input', 'UNSAVED');
  await page.fill('#value-input', 'data');
  await page.click('#form-close');

  await expect(page.locator('#form-dialog')).not.toBeVisible();
  await expect(page.locator('#empty-state')).toBeVisible();
});

test('duplicate key on add shows error and keeps form open', async ({ launched }) => {
  const { page } = launched;
  await addNote(page, 'DUP', 'v1');

  await page.click('#add-btn');
  await page.fill('#key-input', 'DUP');
  await page.fill('#value-input', 'v2');
  await page.click('#submit-btn');

  await expect(page.locator('#form-error')).toBeVisible();
  await expect(page.locator('#form-error')).toContainText('A note with key "DUP" already exists');
  await expect(page.locator('#form-dialog')).toBeVisible();
});

test('typing in key input clears the duplicate error', async ({ launched }) => {
  const { page } = launched;
  await addNote(page, 'DUP', 'v1');

  await page.click('#add-btn');
  await page.fill('#key-input', 'DUP');
  await page.fill('#value-input', 'v2');
  await page.click('#submit-btn');
  await expect(page.locator('#form-error')).toBeVisible();

  await page.fill('#key-input', 'NEW');
  await expect(page.locator('#form-error')).toBeHidden();
});

test('duplicate key when editing shows error', async ({ launched }) => {
  const { page } = launched;
  await addNote(page, 'FOO', 'foo');
  await addNote(page, 'BAR', 'bar');

  await page.click('[aria-label="Edit BAR"]');
  await page.fill('#key-input', 'FOO');
  await page.click('#submit-btn');

  await expect(page.locator('#form-error')).toContainText('A note with key "FOO" already exists');
});

test('saving edit with no changes closes silently without toast', async ({ launched }) => {
  const { page } = launched;
  await addNote(page, 'SAME', 'same');

  await page.click('[aria-label="Edit SAME"]');
  await page.click('#submit-btn');

  await expect(page.locator('#form-dialog')).not.toBeVisible();
  await expect(page.locator('.toast')).toHaveCount(0);
});

test('Enter in value textarea submits the form', async ({ launched }) => {
  const { page } = launched;
  await page.click('#add-btn');
  await page.fill('#key-input', 'ENTER_KEY');
  await page.locator('#value-input').fill('value');
  await page.locator('#value-input').press('Enter');

  await expect(page.locator('.note-key')).toHaveText('ENTER_KEY');
});

test('Shift+Enter in value textarea does not submit the form', async ({ launched }) => {
  const { page } = launched;
  await page.click('#add-btn');
  await page.fill('#key-input', 'STAYS_OPEN');
  await page.locator('#value-input').fill('value');
  await page.locator('#value-input').press('Shift+Enter');

  await expect(page.locator('#form-dialog')).toBeVisible();
  await expect(page.locator('.note-row')).toHaveCount(0);
});

test('pasting multi-line text into value collapses newlines to spaces', async ({ launched }) => {
  const { page } = launched;
  await page.click('#add-btn');
  await page.locator('#value-input').focus();

  await page.evaluate(() => {
    const textarea = document.getElementById('value-input') as HTMLTextAreaElement;
    const dt = new DataTransfer();
    dt.setData('text', 'line1\nline2\r\nline3');
    const event = new ClipboardEvent('paste', {
      clipboardData: dt,
      bubbles: true,
      cancelable: true,
    });
    textarea.dispatchEvent(event);
  });

  await expect(page.locator('#value-input')).toHaveValue('line1 line2 line3');
});
