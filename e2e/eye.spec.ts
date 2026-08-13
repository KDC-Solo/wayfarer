import { expect, test } from '@playwright/test';
import { createHero } from './helpers.ts';

// Strider Mode's signature solo mechanic (p.13-14). Optional in the book,
// so off by default; once on it must do the bookkeeping itself.

test('the Eye is off by default and can be switched on', async ({ page }) => {
  await createHero(page);
  await expect(page.getByText(/Eye of Mordor tracking is off/)).toBeVisible();
  await page.getByRole('button', { name: 'Turn on' }).click();
  await expect(page.getByRole('heading', { name: 'The Eye of Mordor' })).toBeVisible();
  await expect(page.getByText('Hunt threshold 16')).toBeVisible(); // Wild Land, p.13
});

test('the threshold follows the region', async ({ page }) => {
  await createHero(page);
  await page.getByRole('button', { name: 'Turn on' }).click();
  await page.getByLabel('Region travelled').selectOption('border');
  await expect(page.getByText('Hunt threshold 18')).toBeVisible();
  await page.getByLabel('Region travelled').selectOption('dark');
  await expect(page.getByText('Hunt threshold 14')).toBeVisible();
});

test('a Revelation Episode becomes due, and facing it resets to the starting score', async ({ page }) => {
  await createHero(page);
  await page.getByRole('button', { name: 'Turn on' }).click();
  await page.getByLabel('Starting score').fill('2');
  await page.getByLabel('Region travelled').selectOption('dark'); // threshold 14

  const raise = page.getByRole('button', { name: 'Increase Eye Awareness' });
  for (let i = 0; i < 14; i++) await raise.click();

  await expect(page.getByText('A Revelation Episode is due.')).toBeVisible();
  await page.getByRole('button', { name: 'Face the Revelation Episode' }).click();

  await expect(page.getByText('A Revelation Episode is due.')).toHaveCount(0);
  await expect(page.locator('.eye-panel .stepper b')).toHaveText('2');
});

test('the tracker survives a reload', async ({ page }) => {
  await createHero(page);
  await page.getByRole('button', { name: 'Turn on' }).click();
  await page.getByRole('button', { name: 'Increase Eye Awareness' }).click();

  // Wait for the write itself, not the optimistic UI: reloading before
  // IndexedDB has flushed would test the race, not the persistence.
  await expect
    .poll(async () =>
      page.evaluate(async () => {
        const db: IDBDatabase = await new Promise((res, rej) => {
          const r = indexedDB.open('wayfarer');
          r.onsuccess = () => res(r.result);
          r.onerror = () => rej(r.error);
        });
        return new Promise<number>((res) => {
          const rq = db.transaction('chronicle').objectStore('chronicle').get('current');
          rq.onsuccess = () => res(rq.result?.eyeAwareness?.score ?? -1);
        });
      }),
    )
    .toBe(1);

  await page.reload();
  await expect(page.locator('.eye-panel .stepper b')).toHaveText('1');
});
