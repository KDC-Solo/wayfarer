import { expect, test } from '@playwright/test';
import { createHero, openTab } from './helpers.ts';

// F7.4 end to end: author a pack from a real file, activate it, and see
// the art land on the tap-selection dice — with the numeral still there,
// because a pack is decoration and must never change what a roll means.

// A 1×1 red PNG; enough to prove the image pipeline (file → data URL →
// IndexedDB → rendered face) without shipping any artwork.
const RED_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

async function makePack(page: import('@playwright/test').Page, name: string) {
  await openTab(page, 'Templates');
  await page.getByLabel('New pack name').fill(name);
  await page.getByRole('button', { name: 'Create pack' }).click();
}

test('author a pack, map a face, and see it on the Feat die picker', async ({ page }) => {
  await createHero(page);

  // Player-rolls mode is where the tap-selection faces appear.
  await page.getByLabel('Dice input mode').selectOption('player-rolls');
  await makePack(page, 'Hand-inked');

  // Every face slot has its own hidden input, so scope to the Eye's slot
  // rather than to the first image input on the page.
  const eyeSlot = page.locator('.face-slot').filter({ hasText: 'Feat — Eye' });
  await eyeSlot.locator('input[type="file"]').setInputFiles({
    name: 'eye.png',
    mimeType: 'image/png',
    buffer: RED_PNG,
  });
  await expect(page.getByText('1/18 faces')).toBeVisible();

  await page.getByLabel('Active pack').selectOption({ label: 'Hand-inked' });

  // Back to rolling: the Eye face now carries the art, and still reads "Eye".
  await openTab(page, 'Company');
  await page.getByRole('button', { name: '🎲 Roll' }).click();
  const eye = page.getByRole('button', { name: 'Eye of Sauron' });
  await expect(eye).toBeVisible();
  await expect(eye.locator('img')).toHaveCount(1);
  await expect(eye).toContainText('Eye');

  // And the roll still resolves normally through the art. A quick-start
  // hero has real skill ranks, so player-rolls mode asks for the Success
  // pool after the Feat die — tap through it.
  await eye.click();
  for (let i = 0; i < 8; i++) {
    const die = page.getByRole('button', { name: 'Success die 6' });
    if (!(await die.isVisible().catch(() => false))) break;
    await die.click();
  }
  await expect(page.getByText(/total \d+ vs TN/)).toBeVisible();
});

test('a pack survives a reload and rejects a malformed import', async ({ page }) => {
  await createHero(page);
  await makePack(page, 'Persisted');

  // Wait for the pack to actually appear before reloading — creation
  // writes to IndexedDB asynchronously, and reloading mid-write cancels
  // it, which would make this a test of the race rather than of storage.
  await expect(page.getByText('0/18 faces')).toBeVisible();

  await page.reload();
  await openTab(page, 'Templates');
  await expect(page.getByRole('button', { name: 'Persisted', exact: true })).toBeVisible();

  // C4's validation boundary, exercised through the real import path.
  await page.getByRole('button', { name: 'Import pack…' }).click({ trial: true });
  await page.setInputFiles('input[type="file"][accept="application/json"]', {
    name: 'bad.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ id: 'x', name: 'Bad', faces: { 'feat-99': 'data:image/png;base64,x' } })),
  });
  await expect(page.getByText(/Unknown die face/)).toBeVisible();
});
