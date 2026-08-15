import { expect, test } from '@playwright/test';
import { createHero, openTab } from './helpers.ts';

// Guided character creation is driven entirely by imported culture data,
// since the app ships none. Invented cultures here — the real ones come
// from the player's own rulebook and never enter the repo.

const PACK = JSON.stringify({
  format: 'wayfarer-export',
  schemaVersion: 10,
  cultures: [
    {
      id: 'cu1',
      name: 'Testfolk',
      attributeSets: [
        { roll: 1, strength: 5, heart: 7, wits: 2 },
        { roll: 2, strength: 4, heart: 6, wits: 4 },
      ],
      derived: { endurance: 20, hope: 8, parry: 12 },
      skills: { Awe: 1, Battle: 2, Travel: 3 },
      favouredSkillChoices: ['Awe', 'Battle'],
      blessingName: 'Placeholder Blessing',
      standardOfLiving: 'Martial',
      distinctiveFeatures: ['Bold', 'Fair', 'Proud'],
      sourceReference: 'My own copy',
    },
  ],
  callings: [
    {
      id: 'ca1',
      name: 'Testcalling',
      favouredSkillChoices: ['Awareness', 'Healing'],
      additionalFeature: 'Placeholder Feature',
      shadowPath: 'Placeholder Path',
      sourceReference: 'My own copy',
    },
  ],
});

test('guided creation is offered only once cultures are imported', async ({ page }) => {
  await createHero(page, 'Temp');
  await openTab(page, 'Company');
  await page.getByRole('button', { name: '+ Add hero' }).click();
  // With no cultures, the plain form appears instead.
  await expect(page.getByRole('heading', { name: 'New hero' })).toBeVisible();
});

test('a character built from imported data gets its stats without hand-copying', async ({ page }) => {
  await createHero(page, 'Temp');
  await openTab(page, 'Oracle');
  await page.setInputFiles('.roll-panel:has-text("Manage tables") input[type="file"]', {
    name: 'pack.json',
    mimeType: 'application/json',
    buffer: Buffer.from(PACK),
  });
  await expect(page.getByText(/1 cultures/)).toBeVisible();

  await openTab(page, 'Company');
  await page.getByRole('button', { name: '+ Add hero' }).click();
  const cre = page.locator('.roll-panel').filter({ hasText: 'Create a character' });

  await cre.getByLabel('Name').fill('Beran');
  await cre.getByLabel('Calling').selectOption({ label: 'Testcalling' });
  await cre.getByLabel('Set').selectOption({ index: 0 });

  // Derived from the culture's own bases: 5+20, 7+8, 2+12.
  await expect(cre.getByText('Endurance 25 · Hope 15 · Parry 14')).toBeVisible();

  await cre.getByRole('button', { name: 'Bold' }).click();
  await cre.getByRole('button', { name: 'Proud' }).click();
  await cre.getByRole('button', { name: /^Create/ }).click();

  const card = page.locator('.hero-card').filter({ hasText: 'Beran' });
  await expect(card).toBeVisible();
  await expect(card).toContainText('Testfolk');

  await card.getByRole('button', { name: 'Sheet' }).click();
  const sheet = page.locator('.hero-sheet');
  await expect(sheet.getByLabel('Culture')).toHaveValue('Testfolk');
  await expect(sheet.getByLabel('Calling')).toHaveValue('Testcalling');
  // The culture's skill ranks came across rather than needing retyping.
  await expect(sheet.getByRole('button', { name: 'Increase Travel' })).toBeVisible();
});
