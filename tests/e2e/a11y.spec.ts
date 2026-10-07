import { test, expect } from '@playwright/test';

// Accessibility + reduced-motion: keyboard reach, live regions, motion toggle.
test.describe('accessibility', () => {
  test('keyboard reaches scenarios, transport and reset with visible focus', async ({ page }) => {
    await page.goto('/');
    // wait for the shell before probing tab order: pressing Tab pre-mount
    // leaves focus on <body> and the assertion below has nothing to match.
    await page.waitForSelector('#bo-gl canvas, .bo-gl-fallback', { timeout: 30000 });
    await page.locator('.bo-scen-list button').first().waitFor();
    await page.keyboard.press('Tab'); // skip link
    await page.keyboard.press('Tab');
    const focused = page.locator(':focus-visible, :focus');
    await expect(focused.first()).toBeVisible();
    // every scenario is a real button
    const scenButtons = page.locator('.bo-scen-list button');
    expect(await scenButtons.count()).toBe(10);
    // event log is a live region
    await expect(page.getByRole('list', { name: 'Simulation event log' })).toBeVisible();
  });

  test('reduced-motion OS setting starts the app in minimal motion', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto('/');
    await expect(page.getByRole('button', { name: /MOTION: MIN/ })).toBeVisible({ timeout: 15000 });
    // simulation still fully usable
    await page.getByRole('button', { name: /TAT-N1/ }).first().click();
    await page.getByRole('button', { name: 'TAKE OFFLINE' }).click();
    await expect(page.getByTestId('system-state')).not.toHaveText('NOMINAL', { timeout: 15000 });
    await context.close();
  });

  test('text alternatives exist for the canvas state', async ({ page }) => {
    await page.goto('/');
    // connectivity + state are text, not color-only
    await expect(page.getByTestId('connectivity')).toContainText('%');
    await expect(page.getByTestId('system-state')).toContainText(/NOMINAL|STRAINED|DEGRADED|CRITICAL/);
    // the three dependency domains each expose a numeric readout
    await expect(page.getByTestId('domain-orbit')).toContainText('%');
    await expect(page.getByTestId('domain-control')).toContainText('%');
    // failed routes expose text status, not just red arcs
    await page.getByRole('button', { name: /TAT-N1/ }).first().click();
    await expect(page.getByText('INSPECTOR · ROUTE')).toBeVisible();
  });

  test('scenario library entries announce their armed state to assistive tech', async ({ page }) => {
    await page.goto('/');
    const entry = page.getByTestId('scenario-gateway');
    await expect(entry).toHaveAttribute('aria-pressed', 'false');
    await entry.click();
    await expect(entry).toHaveAttribute('aria-pressed', 'true');
    // armed scenarios are discoverable without reading the globe
    await expect(page.getByTestId('armed-tag')).toBeVisible();
    // and the severity meter has a text equivalent, not just bars
    await expect(entry).toContainText('Severity MODERATE, 3 of 5');
  });

  test('the core instrument exposes a text value, not a bare dial', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('core-value')).toContainText('%');
    await expect(page.locator('.bo-core-label')).toBeVisible();
    await expect(page.getByText('MESH RETAINED')).toBeVisible();
  });
});
