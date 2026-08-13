import { expect, test } from '@playwright/test';

// The funnel that decides whether anyone ever uses this: land, name a
// hero, roll, succeed. Guards the specific failure this replaced — a
// nine-field form defaulted to zeros, where TN 18 with no Success dice
// made a new player's first roll unwinnable.

test('a first-time visitor can roll in one click from the landing screen', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Name your hero').fill('Beran');
  await page.getByRole('button', { name: 'Start playing →' }).click();

  await expect(page.getByRole('heading', { name: 'Roll for Beran' })).toBeVisible();
  await page.getByRole('button', { name: '🎲 Roll' }).click();
  await expect(page.getByText(/vs TN/)).toBeVisible();
});

test('the quick-start hero can actually succeed', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start playing →' }).click();

  // Roll repeatedly: with playable defaults, successes must occur. With
  // the old all-zero defaults this loop could never pass.
  let sawSuccess = false;
  for (let i = 0; i < 25 && !sawSuccess; i++) {
    if (i > 0) await page.getByRole('button', { name: 'Roll again' }).click();
    await page.getByRole('button', { name: '🎲 Roll' }).click();
    await expect(page.getByText(/vs TN/)).toBeVisible();
    sawSuccess = await page.locator('.roll-result.is-success').isVisible();
  }
  expect(sawSuccess).toBe(true);
});

test('an unnamed hero still starts, rather than blocking on a required field', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start playing →' }).click();
  await expect(page.getByRole('heading', { name: /Roll for/ })).toBeVisible();
});

test('the character-sheet path is still available for players with a real hero', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'enter your character sheet now' }).click();
  await page.getByLabel('Name').fill('Idis');
  await page.getByLabel('Heart').fill('5');
  await page.getByRole('button', { name: 'Add to company' }).click();
  await expect(page.getByRole('heading', { name: 'Roll for Idis' })).toBeVisible();
});
