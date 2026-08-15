import { expect, test } from '@playwright/test';
import { createHero, openTab } from './helpers.ts';

// Weapons, armour and the bestiary exist to stop combat making you
// retype the same numbers every round. Invented entries here — the real
// ones come from the player's own rulebook and never enter the repo.

const PACK = JSON.stringify({
  format: 'wayfarer-export',
  schemaVersion: 11,
  weapons: [
    { id: 'w1', name: 'Testblade', damage: 4, injury: '16', load: 2, proficiency: 'Swords', notes: '', sourceReference: 'mine' },
  ],
  armour: [
    { id: 'a1', name: 'Testmail', protection: 3, additive: false, load: 9, type: 'Mail', sourceReference: 'mine' },
    { id: 'a2', name: 'Testhelm', protection: 1, additive: true, load: 4, type: 'Headgear', sourceReference: 'mine' },
  ],
  bestiary: [
    {
      id: 'b1', name: 'Testfoe', attributeLevel: 4, endurance: 16, might: 1, hate: 4, parry: 3, armour: 2,
      attacks: [{ name: 'Axe', rating: 3, damage: 5, injury: 18, special: 'Pierce' }],
      fellAbilities: 'Placeholder ability.',
    },
  ],
});

async function importGear(page: import('@playwright/test').Page) {
  await openTab(page, 'Oracle');
  await page.setInputFiles('.roll-panel:has-text("Manage tables") input[type="file"]', {
    name: 'gear.json', mimeType: 'application/json', buffer: Buffer.from(PACK),
  });
  await expect(page.getByText(/1 weapons/)).toBeVisible();
}

test('gear attaches to a hero and totals Load and Protection', async ({ page }) => {
  await createHero(page, 'Beran');
  await importGear(page);

  await openTab(page, 'Company');
  await page.getByRole('button', { name: 'Sheet' }).click();
  const gear = page.locator('.hero-sheet').getByRole('group', { name: 'War gear' });

  await gear.getByLabel('Add weapons').selectOption({ label: 'Testblade (4/16)' });
  await gear.getByRole('button', { name: 'Add', exact: true }).first().click();
  await gear.getByLabel('Add armour').selectOption({ label: 'Testmail (3d)' });
  await gear.getByRole('button', { name: 'Add', exact: true }).last().click();
  await gear.getByLabel('Add armour').selectOption({ label: 'Testhelm (1d)' });
  await gear.getByRole('button', { name: 'Add', exact: true }).last().click();

  // Load 2+9+4; Protection is the suit plus the additive helm.
  await expect(gear.getByText(/Load 15 · Protection 4d/)).toBeVisible();
});

test('a bestiary foe spawns with its stat block instead of being retyped', async ({ page }) => {
  await createHero(page, 'Beran');
  await importGear(page);

  await openTab(page, 'Combat');
  const plan = page.locator('.roll-panel').first();
  await plan.getByLabel('From your bestiary').selectOption({ index: 1 });
  await plan.getByRole('button', { name: 'Add', exact: true }).first().click();

  const entry = plan.locator('fieldset:has-text("Adversaries") li').first();
  await expect(entry).toContainText('Testfoe');
  await expect(entry).toContainText('Endurance 16');
  await expect(entry).toContainText('Axe 3 (5/18, Pierce)');
});

test('a favoured skill rolls Favoured without being told', async ({ page }) => {
  await createHero(page, 'Beran');
  await page.getByRole('button', { name: 'Sheet' }).click();
  await page.locator('.hero-sheet').getByRole('button', { name: 'Done' }).click();

  // No favoured skills yet, so the roll starts Normal.
  await expect(page.locator('.roll-panel-main').getByLabel(/^Favour/)).toHaveValue('normal');
});
