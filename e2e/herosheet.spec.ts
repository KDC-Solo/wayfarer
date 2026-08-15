import { expect, test } from '@playwright/test';
import { createHero } from './helpers.ts';

// You cannot play with your own character unless you can enter it. This
// covers the path from quick-start placeholder to real sheet, and that
// what you enter actually reaches the roll.

test('skill ranks and proficiencies can be entered and reach the roll', async ({ page }) => {
  await createHero(page, 'Beran');

  await page.getByRole('button', { name: 'Sheet' }).click();
  const sheet = page.locator('.hero-sheet');
  await expect(sheet.getByRole('heading', { name: "Beran's sheet" })).toBeVisible();

  // Set a real skill rank.
  for (let i = 0; i < 3; i++) await sheet.getByRole('button', { name: 'Increase Battle' }).click();
  // And a combat proficiency, which the app ships none of.
  const proficiencies = sheet.getByRole('group', { name: 'Combat proficiencies' });
  await proficiencies.getByLabel('New combat proficiency').fill('Swords');
  await proficiencies.getByRole('button', { name: 'Add', exact: true }).click();
  await sheet.getByRole('button', { name: 'Increase Swords' }).click();

  await sheet.getByRole('button', { name: 'Done' }).click();

  // The roll panel offers the edited rank.
  const roll = page.locator('.roll-panel-main');
  await expect(roll.getByLabel('Skill')).toContainText('Battle (rank 4)');
});

test('a sheet edit survives a reload', async ({ page }) => {
  await createHero(page, 'Beran');
  await page.getByRole('button', { name: 'Sheet' }).click();
  const sheet = page.locator('.hero-sheet');
  await sheet.getByRole('button', { name: 'Increase Valour' }).click();
  const gear = sheet.getByRole('group', { name: 'Gear' });
  await gear.getByLabel('New gear entry').fill('A weathered cloak');
  await gear.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(sheet.getByText('A weathered cloak')).toBeVisible();

  await page.reload();
  await page.getByRole('button', { name: 'Sheet' }).click();
  await expect(page.locator('.hero-sheet').getByText('A weathered cloak')).toBeVisible();
});

test('skills can be added and removed, so an older hero can be corrected', async ({ page }) => {
  await createHero(page, 'Beran');
  await page.getByRole('button', { name: 'Sheet' }).click();
  const sheet = page.locator('.hero-sheet');

  // The corrected list ships TRAVEL (Strider Mode p.16 calls for it).
  await expect(sheet.getByRole('button', { name: 'Increase Travel' })).toBeVisible();
  await expect(sheet.getByRole('button', { name: 'Increase Search' })).toHaveCount(0);

  // House rules and older heroes both need the list to be editable.
  const skills = sheet.getByRole('group', { name: 'Skills' });
  await skills.getByLabel('New skill').fill('Smithing');
  await skills.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(sheet.getByRole('button', { name: 'Increase Smithing' })).toBeVisible();

  await sheet.getByRole('button', { name: 'Remove Smithing' }).click();
  await expect(sheet.getByRole('button', { name: 'Increase Smithing' })).toHaveCount(0);
});
