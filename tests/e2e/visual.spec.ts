import { test } from '@playwright/test';

// Visual-QA captures → screenshots/<project>-<state>.png (project-aware names).
async function ready(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.waitForSelector('#bo-gl canvas, .bo-gl-fallback', { timeout: 30000 });
  await page.waitForTimeout(3000);
  await page.evaluate(() => window.scrollTo(0, 0));
}

async function breakTatN1(page: import('@playwright/test').Page, scrubTo: string | null = '6') {
  await page.getByRole('button', { name: /TAT-N1/ }).first().click();
  await page.getByRole('button', { name: 'TAKE OFFLINE' }).click();
  await page.getByRole('button', { name: /PAUSE/ }).click();
  if (scrubTo) await page.getByRole('slider', { name: 'Scrub simulation time' }).fill(scrubTo);
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
}

test.describe('visual captures', () => {
  test('nominal', async ({ page }, info) => {
    await ready(page);
    await page.screenshot({ path: `screenshots/${info.project.name}-nominal.png` });
  });

  test('failed', async ({ page }, info) => {
    await ready(page);
    await breakTatN1(page);
    await page.screenshot({ path: `screenshots/${info.project.name}-failed.png` });
  });

  test('armed', async ({ page }, info) => {
    await ready(page);
    // scenario armed at T+00:00 — preview state, nothing failed yet
    await page.getByRole('button', { name: /DOUBLE CUT/ }).click();
    await page.waitForTimeout(900);
    await page.screenshot({ path: `screenshots/${info.project.name}-armed.png` });
  });

  test('chaos', async ({ page }, info) => {
    await ready(page);
    await page.getByRole('button', { name: /CHAOS MODE/ }).click();
    await page.getByTestId('play-pause').click();
    await page.getByRole('button', { name: /PAUSE/ }).click();
    await page.getByRole('slider', { name: 'Scrub simulation time' }).fill('30');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `screenshots/${info.project.name}-chaos.png` });
  });

  test('orbit', async ({ page }, info) => {
    await ready(page);
    await page.getByTestId('view-hybrid').click();
    await page.getByRole('button', { name: /ISLAND CONTINENT/ }).click();
    await page.getByTestId('play-pause').click();
    await page.getByRole('button', { name: /PAUSE/ }).click();
    await page.getByRole('slider', { name: 'Scrub simulation time' }).fill('10');
    await page.waitForTimeout(1800);
    await page.screenshot({ path: `screenshots/${info.project.name}-orbit.png` });
  });
});

test.describe('laptop capture', () => {
  test.use({ viewport: { width: 1280, height: 800 } });
  test('failed', async ({ page }) => {
    await ready(page);
    await breakTatN1(page);
    await page.screenshot({ path: 'screenshots/laptop-failed.png' });
  });
});
