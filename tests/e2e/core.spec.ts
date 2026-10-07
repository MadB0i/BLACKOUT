import { test, expect } from '@playwright/test';

// Core journey: load → arm a scenario → play → watch the reaction.
test.describe('BLACKOUT core journey', () => {
  test('first load shows the live globe, nominal state and first-run hint', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'BLACKOUT' })).toBeVisible();
    await expect(page.getByTestId('system-state')).toHaveText('NOMINAL');
    await expect(page.getByTestId('connectivity')).toHaveText('100%');
    await expect(page.getByTestId('console-mode')).toHaveText('SYSTEM NOMINAL');
    // globe canvas or the engineered no-WebGL fallback — never a blank page
    const canvas = page.locator('#bo-gl canvas');
    const fallback = page.locator('.bo-gl-fallback');
    await expect(canvas.or(fallback)).toBeVisible();
    await expect(page.getByRole('status').first()).toBeVisible();
  });

  test('select a route, take it offline, see the console react', async ({ page }) => {
    await page.goto('/');
    // pick a route from the accessible list (works with mouse, touch, keyboard)
    await page.getByRole('button', { name: /TAT-N1/ }).first().click();
    await expect(page.getByText('INSPECTOR · ROUTE')).toBeVisible();
    await page.getByRole('button', { name: 'TAKE OFFLINE' }).click();
    await expect(page.getByTestId('system-state')).not.toHaveText('NOMINAL');
    // reroute evidence in the event log
    await expect(page.getByRole('button', { name: /TRAFFIC SHIFT/ }).first()).toBeVisible({ timeout: 15000 });
    // the console shows strain and a regional impact readout
    await expect(page.getByText('STRAINED / OVERLOADED')).toBeVisible();
    await expect(page.getByText('REGIONAL IMPACT')).toBeVisible();
    await expect(page.locator('.bo-region-row').first()).toBeVisible({ timeout: 15000 });
  });

  test('selecting a scenario arms it at T+00:00 without breaking anything', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /DOUBLE CUT/ }).click();
    // armed, previewing, still nominal
    await expect(page.getByTestId('armed-tag')).toBeVisible();
    await expect(page.getByTestId('console-mode')).toHaveText('SCENARIO PREVIEW');
    await expect(page.getByTestId('system-state')).toHaveText('NOMINAL');
    await expect(page.locator('.bo-core-foot')).toContainText('PROJECTED');
    await expect(page.getByText(/T\+00:00 \//)).toBeVisible();
    await expect(page.getByTestId('connectivity')).toHaveText('100%');
    // nothing is playing on its own
    await page.waitForTimeout(1500);
    await expect(page.getByText(/T\+00:00 \//)).toBeVisible();

    // PLAY executes the armed plan
    await page.getByTestId('play-pause').click();
    await expect(page.getByTestId('console-mode')).toHaveText('FAILURE ACTIVE', { timeout: 20000 });
    await expect(page.getByTestId('system-state')).not.toHaveText('NOMINAL');
  });

  test('scenario library loads dual-cut and replays deterministically', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /DOUBLE CUT/ }).click();
    await page.getByTestId('play-pause').click();
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
    await page.getByTestId('play-pause').click();
    await page.getByRole('button', { name: /PAUSE/ }).click();
    await page.getByRole('slider', { name: 'Scrub simulation time' }).fill('2');
    await expect(page.getByText(/T\+00:02 \//)).toBeVisible();
    await page.getByRole('button', { name: 'Step forward 2 seconds' }).click();
    await expect(page.getByText(/T\+00:04 \//)).toBeVisible();
  });

  test('chaos mode starts from a seed and fills the timeline', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /CHAOS MODE/ }).click();
    await page.getByTestId('play-pause').click();
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
    await page.getByRole('button', { name: 'SHARE', exact: true }).click();
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
    // reset returns every domain to nominal and disarms the scenario
    await expect(page.getByTestId('connectivity')).toHaveText('100%');
    await expect(page.getByTestId('domain-orbit')).toHaveText('100%');
    await expect(page.getByTestId('domain-control')).toHaveText('100%');
    await expect(page.getByTestId('console-mode')).toHaveText('SYSTEM NOMINAL');
    await expect(page.getByTestId('armed-tag')).toHaveCount(0);
  });
});

test.describe('dependency domains', () => {
  test('projected failure has amber preview treatment across the frame', async ({ page }, info) => {
    await page.goto('/');
    await page.getByTestId('view-hybrid').click();
    const scenario = page.getByTestId('scenario-cascade');
    if (info.project.name === 'desktop') {
      await scenario.hover();
      await expect(page.locator('.bo-scene-mode')).toHaveText('◇ SCENARIO HOVER PREVIEW');
      await expect(page.getByTestId('console-mode')).toHaveText('SYSTEM NOMINAL');
      await expect(scenario).toHaveAttribute('aria-pressed', 'false');
    }
    await scenario.click();
    await expect(scenario).toHaveAttribute('data-state', 'armed');
    await expect(page.getByTestId('system-state')).toHaveText('NOMINAL');
    await expect(page.getByRole('group', { name: 'Projected dependency domains', exact: true })).toContainText('PROJECTED');
    await expect(page.locator('#bo-gl')).toHaveAttribute('data-state', 'projected');
    await expect(page.locator('.bo-clock')).toContainText('PROJECTED EVENTS');
    await expect(page.getByTestId('metric-demand-unserved')).not.toHaveText('0.0%');
    await expect(page.getByTestId('metric-demand-unserved')).toHaveCSS('color', 'rgb(232, 163, 61)');
    await expect(page.locator('.bo-events .bo-critical strong').first()).toHaveCSS('color', 'rgb(232, 163, 61)');
    await expect(page.locator('.bo-region-bar i.is-on').first()).toHaveCSS('border-top-style', 'dashed');
    // Hidden projected-event text must stay inside the scrolling event strip.
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      page.viewportSize()!.width,
    );

    const projectedConnectivity = await page.getByTestId('metric-connectivity-retained').innerText();
    const projectedOrbit = await page.getByTestId('domain-orbit').innerText();
    const projectedControl = await page.getByTestId('domain-control').innerText();
    await page.getByTestId('play-pause').click();
    await expect(page.locator('#bo-gl')).toHaveAttribute('data-state', 'live');
    await expect(page.locator('.bo-domains-mode')).toHaveCount(0);
    await page.getByRole('button', { name: /PAUSE/ }).click();
    const scrub = page.getByRole('slider', { name: 'Scrub simulation time' });
    await scrub.fill((await scrub.getAttribute('max'))!);
    // Projection uses the existing deterministic end state, unchanged by presentation.
    await expect(page.getByTestId('metric-connectivity-retained')).toHaveText(projectedConnectivity);
    await expect(page.getByTestId('domain-orbit')).toHaveText(projectedOrbit);
    await expect(page.getByTestId('domain-control')).toHaveText(projectedControl);
    await expect(page.getByTestId('metric-demand-unserved')).toHaveCSS('color', 'rgb(224, 87, 74)');
    await expect(page.locator('.bo-events .bo-critical strong').first()).toHaveCSS('color', 'rgb(224, 87, 74)');
  });

  test('scenario lifecycle follows play, pause, completion, replay and reset', async ({ page }) => {
    await page.goto('/');
    const scenario = page.getByTestId('scenario-gateway');
    const action = scenario.locator('.bo-scen-go-t');
    await expect(action).toHaveText('ARM');
    await scenario.click();
    await expect(action).toHaveText('ARMED');
    await expect(page.locator('.bo-scen-help')).toHaveText('Armed · press PLAY to execute.');
    await page.getByTestId('play-pause').click();
    await expect(action).toHaveText('LIVE');
    await expect(page.locator('.bo-scen-help')).toHaveText('Simulation active · run in progress.');
    await page.getByRole('button', { name: /PAUSE/ }).click();
    await expect(action).toHaveText('PAUSED');
    const scrub = page.getByRole('slider', { name: 'Scrub simulation time' });
    await scrub.fill((await scrub.getAttribute('max'))!);
    await expect(action).toHaveText('DONE');
    await expect(page.locator('.bo-scen-help')).toHaveText('Run complete · REPLAY or RESET.');
    await expect(scenario).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: '↺ REPLAY' }).click();
    await expect(action).toHaveText('LIVE');
    await expect(page.getByTestId('armed-tag')).toHaveCount(0);
    await page.getByRole('button', { name: 'RESET', exact: true }).click();
    await expect(action).toHaveText('ARM');
    await expect(scenario).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByTestId('console-mode')).toHaveText('SYSTEM NOMINAL');
    await expect(page.getByTestId('domain-orbit')).toHaveText('100%');
  });

  test('network view hides the orbital layer, orbit and hybrid reveal it', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('orbit-ladder')).toHaveCount(0);

    await page.getByTestId('view-orbit').click();
    await expect(page.getByTestId('orbit-ladder')).toBeVisible();
    await expect(page.getByText(/SYNTHETIC EDUCATIONAL MODEL/)).toBeVisible();
    // the disclosure is honest: spacecraft keep flying
    await expect(page.getByText(/Spacecraft remain in autonomous operation/)).toBeVisible();
    await expect(page.getByTestId('orbit-headline')).toHaveText('ALL SEGMENTS NOMINAL');

    await page.getByTestId('view-hybrid').click();
    await expect(page.getByTestId('orbit-ladder')).toBeVisible();
    await page.getByTestId('view-network').click();
    await expect(page.getByTestId('orbit-ladder')).toHaveCount(0);
  });

  test('an isolated ground station degrades ORBIT while the mesh stays partly alive', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('view-hybrid').click();
    // isolation scenario: Oceania loses every Pacific path at once
    await page.getByRole('button', { name: /ISLAND CONTINENT/ }).click();
    // before PLAY the console is already projecting the cost, and says so
    await expect(page.getByTestId('orbit-headline')).toHaveText(
      'PROJECTED · GROUND-DEPENDENT SERVICES DEGRADED',
    );
    await page.getByTestId('play-pause').click();
    await page.getByRole('button', { name: /PAUSE/ }).click();
    await page.getByRole('slider', { name: 'Scrub simulation time' }).fill('8');
    // the Southern Hemisphere downlink at Sydney loses its only terrestrial path
    await expect(page.getByTestId('domain-orbit')).not.toHaveText('100%', { timeout: 15000 });
    // the same degradation is now live rather than projected
    await expect(page.getByTestId('orbit-headline')).toHaveText(
      'GROUND-DEPENDENT SERVICES DEGRADED',
    );
    // but control sites elsewhere are untouched, and the spacecraft is not "lost"
    await expect(page.getByText(/Spacecraft remain in autonomous operation/)).toBeVisible();
  });
});
