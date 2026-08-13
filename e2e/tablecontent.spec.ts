import { expect, test } from '@playwright/test';
import { createHero, openTab } from './helpers.ts';

// Filling tables from your own book is the app's real onboarding, so it
// gets browser coverage: the fill-as-you-play path (roll a blank row,
// type what the book says, never type it again) and the bulk paste path.

test('a blank row points at the book and remembers what you type', async ({ page }) => {
  await createHero(page);
  await openTab(page, 'Oracle');

  const roller = page.locator('.roll-panel').filter({ hasText: 'Roll on a table' });
  await roller.getByLabel('Table').selectOption({ index: 0 }); // Fortune Table
  await roller.getByRole('button', { name: 'Feat die 4' }).click();

  // It tells you which row and which page rather than shrugging.
  await expect(roller.getByText(/Look up/)).toBeVisible();
  await expect(roller.getByText(/Strider Mode, p\.8/)).toBeVisible();

  await roller.getByLabel('What does your book say?').fill('A fair wind at your back');
  await roller.getByRole('button', { name: 'Log it' }).click();

  // Rolling the same face again finds it already filled in.
  await roller.getByRole('button', { name: 'Feat die 4' }).click();
  await expect(roller.getByText('A fair wind at your back')).toBeVisible();
  await expect(roller.getByLabel('What does your book say?')).toHaveCount(0);
});

test('a Lore section fills from one paste', async ({ page }) => {
  await createHero(page);
  await openTab(page, 'Oracle');

  const lore = page.locator('.roll-panel').filter({ hasText: 'Lore Table' });
  await lore.getByRole('button', { name: 'Edit table' }).click();
  await lore.getByLabel('Feat die section').selectOption('3');

  await lore.getByLabel(/Paste rows for/).fill(
    ['1  Alpha  Bravo  Charlie', '2  Delta  Echo  Foxtrot', '3  Golf  Hotel  India'].join('\n'),
  );
  await lore.getByRole('button', { name: /^Fill / }).click();

  await expect(lore.getByText(/Filled 3 of 6 rows/)).toBeVisible();
  await expect(lore.getByLabel('3 row 1 Action')).toHaveValue('Alpha');
  await expect(lore.getByLabel('3 row 2 Focus')).toHaveValue('Foxtrot');
});
