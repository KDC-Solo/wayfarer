import { expect, type Page } from '@playwright/test';

/** First-run flow: land on the welcome screen and put a hero on the
 * roster, which reveals the tab shell. */
export async function createHero(page: Page, name = 'Idis') {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'The road goes ever on.' })).toBeVisible();
  await page.getByRole('button', { name: 'Create your first hero →' }).click();
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
