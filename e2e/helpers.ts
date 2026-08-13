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

/**
 * Pick a table by name. Two traps this avoids: table order comes from
 * IndexedDB key order (random UUIDs) so indexes are meaningless, and
 * substring matching would let "Fortune Table" also match "Ill-Fortune
 * Table" — whichever happened to sort first.
 */
export async function selectTable(page: Page, name: string) {
  const select = page.locator('.roll-panel').filter({ hasText: 'Roll on a table' }).getByLabel('Table');
  const value = await select.evaluate(
    (el, wanted) =>
      Array.from((el as HTMLSelectElement).options).find(
        (o) => o.textContent?.trim().startsWith(`${wanted} (`),
      )?.value ?? '',
    name,
  );
  if (!value) throw new Error(`No table option named "${name}"`);
  await select.selectOption(value);
}
