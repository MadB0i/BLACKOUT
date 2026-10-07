# TESTING

## Unit + integration (vitest) — 43 tests

`tests/unit/`: graph (shortest path, exclusions, determinism, DNS policy),
simulation (nominal, single/dual absorb, hub loss, cascade, BGP surge,
recovery round-trip, isolation, chaos determinism, horizon), core (RNG streams,
scenario integrity — every step references a real id — share round-trip +
sanitisation of hostile input), orbit (dataset integrity, dependency
propagation, unconditional spacecraft autonomy, regional-impact bounds and
ordering, scenario codes/preview targets).

Run: `npm test` (or `npx vitest run`).

## Browser / E2E (playwright) — 48 checks across desktop and mobile

`tests/e2e/core.spec.ts`: first load, select→break→console, **arm-then-play
(preview never fails anything before PLAY)**, scenario replay determinism,
pause/scrub/step sync, chaos fill, share-link recreation, keyboard
transport+reset and full reset-to-nominal across all three domains, plus domain
switching (network/orbit/hybrid) and independent CONTROL/ORBIT degradation.
Projected/live semantics, projected-event overflow, and scenario lifecycle copy
(ARM → ARMED → LIVE / PAUSED → DONE → replay/reset) have dedicated coverage.
There are 12 journey/domain checks, 5 accessibility checks, 6 state captures,
and 1 performance probe per project — on **desktop and mobile**.
`tests/e2e/a11y.spec.ts`: keyboard reach, reduced-motion startup state, text
alternatives, `aria-pressed` on armed scenarios, textual severity, textual core
instrument. `tests/e2e/visual.spec.ts`: QA captures (nominal, failed, armed,
chaos, orbit + laptop).
`tests/e2e/perf.spec.ts`: FPS + long-task probe with smoke thresholds.

Run: `npx playwright install chromium`, then `npm run test:e2e`.
Playwright uses its normal browser cache. To keep browsers inside the project,
set `PLAYWRIGHT_BROWSERS_PATH=.browsers` for both installation and test execution;
`.browsers/` is git-ignored.

Note: fixed bottom-sheet + mobile emulation traps Playwright's scroll-into-view
in a retry loop (app dispatches taps correctly — verified with force-click
probe); the mobile share test force-clicks with a comment. Keyboard-order tests
wait for the canvas before probing tab order, since Tab pressed pre-mount leaves
focus on `<body>`.

## Screenshot QA

`screenshots/` is a git-ignored working set for nominal, failed, armed, chaos,
orbit, and laptop captures. The final product audit also inspected 1920×1080,
1366×768, and the Pixel 7 mobile viewport through hover, preview, execution,
cascade, completion, replay, and reset.

Presentation assets in `docs/media/` use the final UI: a short demo animation,
an MP4 master, and three 1920×1080 NETWORK/HYBRID captures. Temporary recordings,
audit frames, browser profiles, and rendered README previews stay outside the
repository.

## Environments

- Unit: Node 24, Windows 11.
- Browser: Playwright Chromium 1243 + SwiftShader (software GL). FPS numbers
  from this setup are a lower bound; the adaptive quality tier is verified by
  it (drops bloom/stars <38fps). Real-GPU profiling is an open item for
  contributors (see RELEASE_CHECKLIST.md).
