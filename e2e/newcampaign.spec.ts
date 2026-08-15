import { expect, test } from '@playwright/test';
import { createHero, openTab, selectTable } from './helpers.ts';

const PACK = JSON.stringify({
  format: 'wayfarer-export',
  schemaVersion: 9,
  oracleTables: [
    {
      id: 'p1',
      name: 'Fortune Table',
      rollExpression: 'Feat die',
      sourceReference: 'My own copy, p.8',
      rows: [
        { featFace: 'eye', text: 'Placeholder eye' },
        ...Array.from({ length: 10 }, (_, i) => ({ min: i + 1, max: i + 1, text: `Placeholder ${i + 1}` })),
        { featFace: 'rune', text: 'Placeholder rune' },
      ],
    },
  ],
});

async function importTables(page: import('@playwright/test').Page) {
  await openTab(page, 'Oracle');
  await page.setInputFiles('.roll-panel:has-text("Manage tables") input[type="file"]', {
    name: 'pack.json',
    mimeType: 'application/json',
    buffer: Buffer.from(PACK),
  });
  await expect(page.getByText(/Imported —/)).toBeVisible();
}

test('a new campaign clears play but keeps the tables you transcribed', async ({ page }) => {
  await createHero(page, 'Beran');
  await importTables(page);

  await openTab(page, 'Chronicle');
  await page.getByPlaceholder('What happened, in your own words…').fill('The old campaign.');
  await page.getByRole('button', { name: 'Add entry' }).click();
  await expect(page.getByText('The old campaign.')).toBeVisible();

  await openTab(page, 'Setup');
  await page.getByRole('button', { name: 'Start a new campaign…' }).click();
  await page.getByRole('button', { name: 'Clear campaign, keep my tables' }).click();

  // Back to a blank slate: the welcome screen, no hero, no chronicle.
  await expect(page.getByRole('heading', { name: 'The road goes ever on.' })).toBeVisible();

  // …but the transcription survived.
  await page.getByLabel('Name your hero').fill('Second');
  await page.getByRole('button', { name: 'Start playing →' }).click();
  await openTab(page, 'Oracle');
  const roller = page.locator('.roll-panel').filter({ hasText: 'Roll on a table' });
  await selectTable(page, 'Fortune Table');
  await roller.getByRole('button', { name: 'Feat die 4' }).click();
  await expect(roller.locator('.table-result')).toHaveText('Placeholder 4');

  await openTab(page, 'Chronicle');
  await expect(page.getByText('The old campaign.')).toHaveCount(0);
});

test('clearing everything also resets the tables to blank skeletons', async ({ page }) => {
  await createHero(page, 'Beran');
  await importTables(page);

  await openTab(page, 'Setup');
  await page.getByRole('button', { name: 'Start a new campaign…' }).click();
  await page.getByLabel(/Keep the table content/).uncheck();
  await page.getByRole('button', { name: 'Clear everything' }).click();

  await page.getByLabel('Name your hero').fill('Third');
  await page.getByRole('button', { name: 'Start playing →' }).click();
  await openTab(page, 'Oracle');
  const roller = page.locator('.roll-panel').filter({ hasText: 'Roll on a table' });
  await selectTable(page, 'Fortune Table');
  await roller.getByRole('button', { name: 'Feat die 4' }).click();
  // Re-seeded blank, so it asks for the lookup again.
  await expect(roller.getByLabel('What does your book say?')).toBeVisible();
});

test('the destructive step is behind a confirmation, and cancellable', async ({ page }) => {
  await createHero(page, 'Beran');
  await openTab(page, 'Setup');

  await expect(page.getByRole('button', { name: 'Clear campaign, keep my tables' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Start a new campaign…' }).click();
  await expect(page.getByText('This cannot be undone.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Export a backup first' })).toBeVisible();

  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('button', { name: 'Clear campaign, keep my tables' })).toHaveCount(0);

  // Nothing was touched.
  await openTab(page, 'Company');
  await expect(page.getByRole('heading', { name: 'Roll for Beran' })).toBeVisible();
});
