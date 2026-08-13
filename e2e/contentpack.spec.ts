import { expect, test } from '@playwright/test';
import { createHero, openTab, selectTable } from './helpers.ts';

// Importing table content must fill the shipped skeletons in place and
// leave a campaign in progress untouched. Uses an invented pack — the
// real one is built from the player's own book and never enters the repo.

const PACK = JSON.stringify({
  format: 'wayfarer-export',
  schemaVersion: 8,
  oracleTables: [
    {
      id: 'pack-fortune',
      name: 'Fortune Table',
      rollExpression: 'Feat die',
      sourceReference: 'My own copy, p.8',
      rows: [
        { featFace: 'eye', text: 'Placeholder eye result' },
        ...Array.from({ length: 10 }, (_, i) => ({ min: i + 1, max: i + 1, text: `Placeholder ${i + 1}` })),
        { featFace: 'rune', text: 'Placeholder rune result' },
      ],
    },
  ],
});

test('a content pack fills the skeletons and spares the chronicle', async ({ page }) => {
  await createHero(page);

  await openTab(page, 'Chronicle');
  await page.getByPlaceholder('What happened, in your own words…').fill('Before the import.');
  await page.getByRole('button', { name: 'Add entry' }).click();
  await expect(page.getByText('Before the import.')).toBeVisible();

  await openTab(page, 'Oracle');
  await page.setInputFiles('.roll-panel:has-text("Tables") input[type="file"]', {
    name: 'pack.json',
    mimeType: 'application/json',
    buffer: Buffer.from(PACK),
  });
  await expect(page.getByText(/Table content imported/)).toBeVisible();

  // Wait for the reload that follows the import to reach the UI before
  // rolling: the pack's roll expression differs from the seeded
  // skeleton's, so this option text only exists once state has caught up.
  const roller = page.locator('.roll-panel').filter({ hasText: 'Roll on a table' });
  await expect(roller.locator('option', { hasText: 'Fortune Table (Feat die)' }).first()).toHaveText(
    'Fortune Table (Feat die)',
  );

  // The blank row that used to ask for a lookup now just answers.
  await selectTable(page, 'Fortune Table');
  await roller.getByRole('button', { name: 'Feat die 4' }).click();
  await expect(roller.locator('.table-result')).toHaveText('Placeholder 4');
  await expect(roller.getByLabel('What does your book say?')).toHaveCount(0);

  // No duplicate table was created, and play state survived.
  const options = await page.locator('.roll-panel:has-text("Roll on a table") option').allTextContents();
  expect(options.filter((o) => o.startsWith('Fortune Table'))).toHaveLength(1);

  await openTab(page, 'Chronicle');
  await expect(page.getByText('Before the import.')).toBeVisible();
});
