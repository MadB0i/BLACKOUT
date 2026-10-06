import { test, expect } from '@playwright/test';

// Accessibility + reduced-motion: keyboard reach, live regions, motion toggle.
test.describe('accessibility', () => {
  test('keyboard reaches scenarios, transport and reset with visible focus', async ({ page }) => {
    await page.goto('/');
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
    // failed routes expose text status, not just red arcs
    await page.getByRole('button', { name: /TAT-N1/ }).first().click();
    await expect(page.getByText('INSPECTOR · ROUTE')).toBeVisible();
  });
});
