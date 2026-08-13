import { expect, type Page } from '@playwright/test';

/** The activation path itself: name, one click, playable. */
export async function createHero(page: Page, name = 'Idis') {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'The road goes ever on.' })).toBeVisible();
  await page.getByLabel('Name your hero').fill(name);
  await page.getByRole('button', { name: 'Start playing →' }).click();
  await expect(page.getByRole('navigation', { name: 'Sections' })).toBeVisible();
}

/** The "I have my character sheet" path, for tests that need exact stats. */
export async function createHeroFromSheet(page: Page, name = 'Idis') {
  await page.goto('/');
  await page.getByRole('button', { name: 'enter your character sheet now' }).click();
  await page.getByLabel('Name').fill(name);
  await page.getByLabel('Heart').fill('5');
  await page.getByLabel('Endurance').fill('24');
  await page.getByLabel('Hope').fill('12');
  await page.getByRole('button', { name: 'Add to company' }).click();
  await expect(page.getByRole('navigation', { name: 'Sections' })).toBeVisible();
}

export async function openTab(page: Page, label: string) {
  await page.getByRole('navigation', { name: 'Sections' }).getByRole('button', { name: label }).click();
}
