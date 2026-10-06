# ARCHITECTURE

BLACKOUT is a static single-page app. No backend, no API keys, no telemetry.

```
src/
  core/        Pure simulation truth (no React, no three.js)
    types.ts       model types + tuning-free contracts
    graph.ts       adjacency, Dijkstra, k-alternate paths, components, policy
    simulation.ts  runSimulation / snapshotAt — reroute, cascade, shed, metrics
    serialize.ts   versioned share-state codec (sanitised)
    rng.ts         mulberry32 + seed hashing (deterministic chaos + jitter)
  data/
    topology.ts    26 synthetic nodes / 54 synthetic edges
    scenarios.ts   10 authored scenarios (deterministic steps + seeds)
    chaos.ts       seeded 8-step chaos plan builder
    landDots.json  generated coastline dots (see DATA_SOURCES.md)
  state/
    store.ts       zustand: failures, simT clock, selection, layers, prefs
  scene/
    Globe.tsx      Canvas shell, camera rig, adaptive quality, lazy FX
    Earth.tsx      custom globe/atmosphere shaders, land dots, graticule
    Network.tsx    arcs, pulses, node markers, shockwaves, picking
    geo.ts         lat/lon math, arc curves, graticule builder
    Fx.tsx         lazy post chain (Bloom + Vignette, high tier only)
  ui/
    TopStrip, ScenarioPanel, Inspector, BlastRadius, Timeline,
    ShareMenu, FirstRun, format
  export/
    share.ts       link building + clipboard
    screenshot.ts  composed 1920×1080 PNG export
    replayCapture.ts  MediaRecorder WebM capture + fallback messaging
  workers/         (reserved) — sim is O(ms) at this scale; no worker needed.
```

## Key separations

- **Rendering never decides simulation.** `scene/` reads `snapshot` objects produced
  by `core/`; scrubbing re-runs pure functions, so visuals and model cannot drift.
- **Time is data.** Failures carry absolute sim-seconds; `snapshotAt(t)` replays
  deterministically. Pause/step/scrub/replay/share are all the same code path.
- **Clock writes are throttled to 10Hz** (`App` rAF loop); in-scene animation
  (pulses, rings) runs at full frame rate from refs, never through React state.

## State flow

`user action → store.failures/simT → recompute snapshot → subscribers render`
Snapshots are memoised by the store update itself (one recompute per clock tick).
