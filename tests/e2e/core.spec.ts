import { test, expect } from '@playwright/test';

// Core journey: load → select infrastructure → break it → watch the reaction.
test.describe('BLACKOUT core journey', () => {
  test('first load shows the live globe, nominal state and first-run hint', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'BLACKOUT' })).toBeVisible();
    await expect(page.getByTestId('system-state')).toHaveText('NOMINAL');
    await expect(page.getByTestId('connectivity')).toHaveText('100.0%');
    // globe canvas or the engineered no-WebGL fallback — never a blank page
    const canvas = page.locator('#bo-gl canvas');
    const fallback = page.locator('.bo-gl-fallback');
    await expect(canvas.or(fallback)).toBeVisible();
    await expect(page.getByRole('status').first()).toBeVisible();
  });

  test('select a route, take it offline, see blast radius react', async ({ page }) => {
    await page.goto('/');
    // pick a route from the accessible list (works with mouse, touch, keyboard)
    await page.getByRole('button', { name: /TAT-N1/ }).first().click();
    await expect(page.getByText('INSPECTOR · ROUTE')).toBeVisible();
    await page.getByRole('button', { name: 'TAKE OFFLINE' }).click();
    await expect(page.getByTestId('system-state')).not.toHaveText('NOMINAL');
    // reroute evidence in the event log
    await expect(page.getByRole('button', { name: /TRAFFIC SHIFT/ }).first()).toBeVisible({ timeout: 15000 });
    // blast radius shows strain
    await expect(page.getByText('STRAINED / OVERLOADED')).toBeVisible();
  });

  test('scenario library loads dual-cut and replays deterministically', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /DOUBLE CUT/ }).click();
    await expect(page.getByTestId('system-state')).not.toHaveText('NOMINAL', { timeout: 20000 });
    // freeze at T+0 for a deterministic comparison (the live clock would race)
    await page.getByRole('button', { name: /PAUSE/ }).click();
    await page.getByRole('slider', { name: 'Scrub simulation time' }).fill('0');
    const first = await page.locator('.bo-events').innerText();
    await page.getByRole('button', { name: '↺ REPLAY' }).click();
    await page.getByRole('button', { name: /PAUSE/ }).click();
    await page.getByRole('slider', { name: 'Scrub simulation time' }).fill('0');
    const second = await page.locator('.bo-events').innerText();
    expect(second).toBe(first);
  });

  test('pause, scrub and step keep sim and visuals in sync', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /DOMINOES/ }).click();
    await page.getByRole('button', { name: /PAUSE/ }).click();
    await page.getByRole('slider', { name: 'Scrub simulation time' }).fill('2');
    await expect(page.getByText(/T\+00:02 \//)).toBeVisible();
    await page.getByRole('button', { name: 'Step forward 2 seconds' }).click();
    await expect(page.getByText(/T\+00:04 \//)).toBeVisible();
  });

  test('chaos mode starts from a seed and fills the timeline', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /CHAOS MODE/ }).click();
    await expect(page.getByTestId('system-state')).not.toHaveText('NOMINAL', { timeout: 20000 });
    // deterministic check: pause and scrub deep into the seeded plan
    await page.getByRole('button', { name: /PAUSE/ }).click();
    await page.getByRole('slider', { name: 'Scrub simulation time' }).fill('40');
    const count = await page.locator('.bo-events > li').count();
    expect(count).toBeGreaterThan(6);
  });

  test('share link recreates the failure state', async ({ page, context }, testInfo) => {
    await page.goto('/');
    await page.getByRole('button', { name: /TAT-N1/ }).first().click();
    await page.getByRole('button', { name: 'TAKE OFFLINE' }).click();
    await page.getByRole('button', { name: /PAUSE/ }).click();
    await page.getByRole('button', { name: 'SHARE' }).click();
    // stub clipboard: read the token via the copy path
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    // NOTE: fixed bottom-sheet + mobile emulation traps Playwright's
    // scroll-into-view in a retry loop; force still sends a trusted tap.
    const force = testInfo.project.name === 'mobile' ? { force: true } : {};
    await page.getByRole('button', { name: 'COPY SHARE LINK' }).click(force);
    const url = await page.evaluate(() => navigator.clipboard.readText());
    expect(url).toContain('?s=');
    const token = new URL(url).searchParams.get('s');
    expect(token).toBeTruthy();

    const page2 = await context.newPage();
    await page2.goto(`/?s=${token}`);
    await expect(page2.getByTestId('system-state')).not.toHaveText('NOMINAL', { timeout: 15000 });
    await expect(page2.getByText('Shared blackout loaded').first()).toBeVisible();
  });

  test('keyboard operates transport and reset', async ({ page }) => {
    await page.goto('/');
    // deterministic order: step first from a fresh paused T+0, then play, then reset
    await page.keyboard.press('ArrowRight');
    await expect(page.getByText(/T\+00:02 \//)).toBeVisible();
    await page.keyboard.press(' ');
    await expect(page.getByRole('button', { name: /PAUSE/ })).toBeVisible();
    await page.keyboard.press('r');
    await expect(page.getByTestId('system-state')).toHaveText('NOMINAL');
  });
});
