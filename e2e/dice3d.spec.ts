import { expect, test } from '@playwright/test';
import { createHero } from './helpers.ts';

// Phase 7's load-bearing guarantee is a negative one: nothing in Phases
// 1-6 may depend on the 3D module (PRD §6). These run in a real browser,
// where the module genuinely may fail to load — headless Chromium often
// has no usable WebGL — which is exactly the condition F7.2 describes.

test('rolling works with 3D off — the default, and the fallback path', async ({ page }) => {
  await createHero(page);
  await expect(page.getByLabel('3D dice')).toHaveValue('off');

  await page.getByRole('button', { name: '🎲 Roll' }).click();
  await expect(page.getByText(/total \d+ vs TN/)).toBeVisible();
});

test('turning 3D on never blocks the roll from resolving (F7.2)', async ({ page }) => {
  await createHero(page);

  await page.getByLabel('3D dice').selectOption('low');
  await page.getByRole('button', { name: '🎲 Roll' }).click();

  // Whether the simulation loads, fails, or is still fetching its assets,
  // a result must appear — the numeric path backs every outcome.
  await expect(page.getByText(/total \d+ vs TN/)).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/\d+ log entries/)).toBeVisible();
});

test('the quality setting persists across a reload (F7.5)', async ({ page }) => {
  await createHero(page);
  await page.getByLabel('3D dice').selectOption('high');
  await page.reload();
  await expect(page.getByLabel('3D dice')).toHaveValue('high');
});

test('no 3D assets are fetched until 3D is switched on (F7.2 — lazy)', async ({ page }) => {
  const diceRequests: string[] = [];
  page.on('request', (request) => {
    if (/dice-box|world\.|ammo|Dice-/.test(request.url())) diceRequests.push(request.url());
  });

  await createHero(page);
  await page.getByRole('button', { name: '🎲 Roll' }).click();
  await expect(page.getByText(/total \d+ vs TN/)).toBeVisible();

  // A full first-run and a resolved roll, with nothing from the module.
  expect(diceRequests).toEqual([]);
});

test('with 3D on, the simulation renders into a stable canvas and always yields a result', async ({ page }) => {
  // Budget for the worst case this test deliberately tolerates: if the
  // module can't load, each roll waits out DICE_3D_TIMEOUT_MS (12s)
  // before falling back, and the point is that a result still appears.
  test.setTimeout(90_000);
  await createHero(page);
  await page.getByLabel('3D dice').selectOption('high');

  // Several rolls, because dice-box's physics is not perfectly reliable:
  // a die can settle cocked and the library then logs "colliderFaceMap
  // Error: No value found for d12 mesh face -1" and returns nothing
  // usable. That is precisely the failure F7.2's fallback exists for, so
  // the contract under test is "a result appears every time," not "the
  // library never errors" — asserting the latter would be asserting on a
  // third party's flakiness.
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: /🎲 Roll|Roll again/ }).click();
    await expect(page.getByText(/total \d+ vs TN/)).toBeVisible({ timeout: 20000 });
  }

  // The tray persists across the roll's phase change — if it unmounted,
  // dice-box would lose the container it renders into mid-animation.
  await expect(page.locator('#dice-tray canvas')).toHaveCount(1);
});
