# TESTING

## Unit + integration (vitest) — 26 tests

`tests/unit/`: graph (shortest path, exclusions, determinism, DNS policy),
simulation (nominal, single/dual absorb, hub loss, cascade, BGP surge,
recovery round-trip, isolation, chaos determinism, horizon), core (RNG streams,
scenario integrity — every step references a real id — share round-trip +
sanitisation of hostile input).

Run: `npm test` (or `npx vitest run`).

## Browser / E2E (playwright) — 7 journey + 3 a11y + captures + perf

`tests/e2e/core.spec.ts`: first load, select→break→blast-radius,
scenario replay determinism, pause/scrub/step sync, chaos fill, share-link
recreation, keyboard transport+reset — on **desktop and mobile** projects.
`tests/e2e/a11y.spec.ts`: keyboard reach, reduced-motion startup state,
text alternatives. `tests/e2e/visual.spec.ts`: QA captures.
`tests/e2e/perf.spec.ts`: FPS + long-task probe with smoke thresholds.

Run: `npm run test:e2e` (Chromium via `PLAYWRIGHT_BROWSERS_PATH=.browsers`).
Browsers live on D: (`npx playwright install chromium`), nothing global.

Note: fixed bottom-sheet + mobile emulation traps Playwright's scroll-into-view
in a retry loop (app dispatches taps correctly — verified with force-click
probe); the mobile share test force-clicks with a comment.

## Screenshot QA

`Screenshots/` (git-ignored working set) at 1440×900, 1280×800, mobile portrait:
nominal, failed, chaos states — reviewed in-repo during development
(see RELEASE_CHECKLIST.md). Committed heroes: `docs/hero-failed.png`,
`docs/hero-chaos.png`.

## Environments

- Unit: Node 24, Windows 11.
- Browser: Playwright Chromium 1243 + SwiftShader (software GL). FPS numbers
  from this setup are a lower bound; the adaptive quality tier is verified by
  it (drops bloom/stars <38fps). Real-GPU profiling is an open item for
  contributors (see RELEASE_CHECKLIST.md).
