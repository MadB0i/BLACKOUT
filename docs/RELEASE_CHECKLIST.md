# RELEASE CHECKLIST

First public release — all boxes must be ticked before any publish step
(which itself needs explicit authorisation).

## Function

- [x] Globe renders (WebGL) + engineered no-WebGL fallback
- [x] Route/node selection (globe picking + accessible list)
- [x] Failure types: edge, node, surge, recover-edge/node
- [x] Deterministic reroute + cascade + shed + recovery
- [x] Impact console reacts live (core instrument, FLOW/FAILURE/STRESS groups, regional bars)
- [x] Scenario library: hover preview, arm at T+00:00, PLAY to execute
- [x] 10 scenarios incl. authored CHAOS plan + custom seeds
- [x] Timeline: play/pause/step/scrub/speed/restart/jump-to-event
- [x] Share URL recreates state; invalid links handled
- [x] PNG export (1920×1080, branded, labelled simulated)
- [x] 10s WebM replay export + unsupported fallback message
- [x] First-run hint (one line, dismisses permanently)
- [x] Mobile layout (stacked, bottom sheet, touch targets)
- [x] Reduced-motion (OS + manual) verified by test
- [x] Sound: deliberately omitted (no material gain; autoplay-safe silence)
- [x] Domain selector NETWORK / ORBIT / HYBRID with synthetic-model disclosure
- [x] Orbital dependency chain (ground segment → telemetry → command → timing →
      dissemination) derived purely from terrestrial reachability
- [x] Three-domain global status (MESH / ORBIT / CONTROL) degrading independently

## Quality

- [x] `tsc --noEmit` clean, `eslint` clean, `vite build` clean
- [x] 43 unit/integration tests pass
- [x] 48 E2E checks pass on desktop and mobile Chromium
- [x] Final UI reviewed at 1920×1080, 1366×768, and Pixel 7 through the scenario lifecycle
- [x] Perf probed: SwiftShader (software GL, no GPU) 6–30fps, p95 frame
      33–280ms, 0–58 long tasks depending on load — a lower bound;
      adaptive tier verified (sheds FX <38fps; chaos runs faster than
      nominal once it kicks in). Real-GPU profiling: open to
      contributors with hardware.
- [x] `npm audit`: 3 findings, all in vitest's dev-only chain
      (@vitest/mocker, tinypool) — never shipped; upgrade to vitest 5 is
      breaking, deferred and recorded here.
- [x] No secrets, no keys, no telemetry, no runtime network calls
      (fonts CSS is the only external fetch, with system fallbacks)
- [x] Data licensing documented (DATA_SOURCES.md), synthetic model labelled
      everywhere it matters

## Docs & brand

- [x] README (release quality), ARCHITECTURE, SIMULATION_MODEL, DATA_SOURCES,
      VISUAL_SYSTEM, ACCESSIBILITY, TESTING, this checklist
- [x] favicon.svg, og.svg, final demo GIF/MP4 and three 1920×1080 captures in docs/media/
- [x] Keyboard shortcuts documented (README + in-app model note)

## Git

- [ ] Review and commit the current working tree after authorisation
- [ ] Authorise publishing separately; presentation work does not create a tag or release
