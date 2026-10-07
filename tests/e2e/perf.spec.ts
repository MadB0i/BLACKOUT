import { test } from '@playwright/test';

// One-shot perf probe: FPS + long tasks, nominal and failed states.
// Wall-time bounded (8s per phase) so it terminates on any hardware.
test('perf probe', async ({ page }) => {
  test.setTimeout(120000);
  await page.goto('/');
  await page.waitForSelector('#bo-gl canvas', { timeout: 30000 });
  await page.waitForTimeout(3000);
  const measure = (label: string) =>
    page.evaluate(async (l) => {
      const samples: number[] = [];
      let last = performance.now();
      let longTasks = 0;
      const obs = new PerformanceObserver((list) => {
        longTasks += list.getEntries().length;
      });
      try {
        obs.observe({ entryTypes: ['longtask'] });
      } catch {
        /* unsupported */
      }
      const deadline = performance.now() + 8000;
      await new Promise<void>((resolve) => {
        const tick = (now: number) => {
          samples.push(now - last);
          last = now;
          if (performance.now() < deadline) requestAnimationFrame(tick);
          else resolve();
        };
        requestAnimationFrame(tick);
      });
      obs.disconnect();
      samples.sort((a, b) => a - b);
      const avg = samples.reduce((s, v) => s + v, 0) / Math.max(1, samples.length);
      const p95 = samples[Math.floor(samples.length * 0.95)] ?? 0;
      // Stall guard uses the MEDIAN frame: a genuinely stalled loop has every
      // frame long, while a host hiccup (busy CI box, SwiftShader contention)
      // only stretches a few. Averaging over the mean lets unrelated machine
      // load fail an otherwise healthy render loop.
      const med = samples[Math.floor(samples.length / 2)] ?? 0;
      return `${l}: frames=${samples.length} avgFPS=${(1000 / avg).toFixed(1)} medianFPS=${(1000 / med).toFixed(1)} p95frame=${p95.toFixed(1)}ms longtasks=${longTasks}`;
    }, label);
  const nominal = (await measure('nominal')) as string;
  console.log('PERF', nominal);
  await page.getByRole('button', { name: /CHAOS MODE/ }).click();
  await page.getByTestId('play-pause').click();
  await page.waitForTimeout(2000);
  const chaos = (await measure('chaos-playing')) as string;
  console.log('PERF', chaos);
  // Stall guard for software rendering (SwiftShader, no GPU): the frame loop
  // must keep progressing. Absolute numbers are environment-bound (this rig
  // measures 6–30fps); real GPUs run this scene at 60fps, and the in-app
  // adaptive tier (see QualityProbe) sheds bloom/stars below ~38fps.
  for (const line of [nominal, chaos]) {
    const fps = Number(/medianFPS=([\d.]+)/.exec(line)?.[1] ?? '0');
    test.expect(fps, `stalled frame loop: ${line}`).toBeGreaterThan(1.5);
  }
});
