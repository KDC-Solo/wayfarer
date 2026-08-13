import { expect, test, type Page } from '@playwright/test';
import { createHero, openTab } from './helpers.ts';

// End-to-end smoke of every tab's core loop, in a real browser with real
// IndexedDB. Screenshots land in e2e/screenshots/ (gitignored) for visual
// review — this doubles as the "honest look in a real browser" CLAUDE.md
// asked for.

async function shot(page: Page, name: string, projectName: string) {
  // Let CSS transitions finish and park the pointer off the UI first.
  // Without this, captures land mid-transition and misrepresent state —
  // an early pass had me chasing a "nav highlights the wrong tab" bug
  // that was only the tab-switch transition frozen at t=0.
  await page.mouse.move(0, 0);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `e2e/screenshots/${projectName}-${name}.png`, fullPage: true });
}

test('first run: welcome → hero → skill roll lands in the log', async ({ page }, testInfo) => {
  await createHero(page);
  await shot(page, '01-company', testInfo.project.name);

  // App-rolls mode: one click resolves and logs.
  await page.getByRole('button', { name: '🎲 Roll' }).click();
  await expect(page.getByText(/total \d+ vs TN/)).toBeVisible();
  await expect(page.getByText(/\d+ log entries/)).toBeVisible();
  await shot(page, '02-rolled', testInfo.project.name);
});

test('oracle: Telling Table answers and the Lore Table falls back on blanks', async ({ page }, testInfo) => {
  await createHero(page);
  await openTab(page, 'Oracle');

  await page.getByLabel('Question').fill('Is the bridge guarded?');
  await page.getByRole('button', { name: 'Ask' }).click();
  await expect(page.getByText(/yes|no/i).first()).toBeVisible();

  // The shipped Lore Table is an empty skeleton — consulting it must not
  // block (F2.6). It now names the section and row to look up and offers
  // to keep whatever the player reads out of their book.
  await page.getByRole('button', { name: '🎲 Consult' }).click();
  await expect(page.locator('.lookup-cue')).toContainText('Strider Mode p.11-12');
  await expect(page.getByPlaceholder(/Read Action from your book/)).toBeVisible();
  await shot(page, '03-oracle', testInfo.project.name);
});

test('journey: plan, run a leg step, pause survives reload (N4)', async ({ page }, testInfo) => {
  await createHero(page);
  await openTab(page, 'Journey');

  await page.getByLabel('Origin').fill('Bree');
  await page.getByLabel('Destination').fill('Rivendell');
  await page.getByRole('button', { name: 'Add waypoint' }).click();
  await page.getByPlaceholder('Name').fill('Weathertop');
  await shot(page, '04-journey-plan', testInfo.project.name);
  await page.getByRole('button', { name: '🗺️ Begin journey' }).click();

  await expect(page.getByRole('heading', { name: /Journey: Bree → Rivendell/ })).toBeVisible();
  await shot(page, '05-journey-running', testInfo.project.name);

  // Mid-journey session resumption: reload and land back on the same leg.
  await page.reload();
  await openTab(page, 'Journey');
  await expect(page.getByRole('heading', { name: /Journey: Bree → Rivendell/ })).toBeVisible();
});

test('combat: begin with an adversary, act, adjust the overview', async ({ page }, testInfo) => {
  await createHero(page);
  await openTab(page, 'Combat');

  await page.getByLabel('Name', { exact: true }).first().fill('Ambush at the ford');
  const adversaryFieldset = page.getByRole('group', { name: 'Adversaries' });
  await adversaryFieldset.getByLabel('Name').fill('Orc Soldier');
  await adversaryFieldset.getByLabel('Endurance').fill('12');
  await adversaryFieldset.getByLabel('Hate').fill('2');
  await adversaryFieldset.getByRole('button', { name: 'Add adversary' }).click();
  await shot(page, '06-combat-plan', testInfo.project.name);
  await page.getByRole('button', { name: '⚔️ Begin combat' }).click();

  await expect(page.getByRole('heading', { name: /Ambush at the ford — Round 1/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Orc Soldier' })).toBeVisible();

  // The default round template opens with the declare-action prompt.
  await expect(page.getByText(/declare their action/)).toBeVisible();
  await shot(page, '07-combat-running', testInfo.project.name);

  // F5.6/F5.7 — tap an adversary pool from the overview.
  await page.getByRole('button', { name: 'Decrease Orc Soldier endurance' }).click();
  await expect(page.getByText('Endurance 11')).toBeVisible();
});

test('chronicle: session, prose, filter', async ({ page }, testInfo) => {
  await createHero(page);
  await openTab(page, 'Chronicle');

  await page.getByRole('button', { name: '▶ Start session 1' }).click();
  await expect(page.getByText(/Session 1 ·/)).toBeVisible();

  await page.getByPlaceholder('What happened, in your own words…').fill('We set out at dawn.');
  await page.getByRole('button', { name: 'Add entry' }).click();
  await expect(page.getByText('We set out at dawn.')).toBeVisible();

  await page.getByLabel('Type').selectOption('prose');
  await expect(page.getByText('We set out at dawn.')).toBeVisible();
  await expect(page.getByText('Session 1 begins.')).not.toBeVisible();
  await shot(page, '08-chronicle', testInfo.project.name);
});

test('fellowship: advance the year and open the first hero turn', async ({ page }, testInfo) => {
  await createHero(page);
  await openTab(page, 'Fellowship');

  await page.getByRole('button', { name: /Advance year & open Fellowship Phase/ }).click();
  await expect(page.getByRole('heading', { name: /Fellowship Phase — Year 1/ })).toBeVisible();
  await shot(page, '09-fellowship', testInfo.project.name);
});

test('templates: the three default templates ship', async ({ page }, testInfo) => {
  await createHero(page);
  await openTab(page, 'Templates');

  await expect(page.getByRole('button', { name: 'Standard Journey Leg', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Standard Fellowship Phase', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Standard Combat Round', exact: true })).toBeVisible();
  await shot(page, '10-templates', testInfo.project.name);
});
