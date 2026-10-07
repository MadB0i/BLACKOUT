# ARCHITECTURE

BLACKOUT is a static single-page app. No backend, no API keys, no telemetry.

```
src/
  core/        Pure simulation truth (no React, no three.js)
    types.ts       model types + tuning-free contracts
    graph.ts       adjacency, Dijkstra, k-alternate paths, components, policy
    simulation.ts  runSimulation / snapshotAt — reroute, cascade, shed, metrics
    orbitSim.ts    ground-station reachability → orbital dependency propagation
    serialize.ts   versioned share-state codec (sanitised)
    rng.ts         mulberry32 + seed hashing (deterministic chaos + jitter)
  data/
    topology.ts    26 synthetic nodes / 54 synthetic edges
    scenarios.ts   10 authored scenarios (deterministic steps + seeds + domain)
    orbit.ts       synthetic orbital classes + ground stations (see DATA_SOURCES)
    chaos.ts       seeded 8-step chaos plan builder
    landDots.json  generated coastline dots (see DATA_SOURCES.md)
  state/
    store.ts       zustand: failures, simT clock, selection, layers, view,
                   armed preview, hover preview, prefs
  scene/
    Globe.tsx      Canvas shell, camera rig, adaptive quality, lazy FX
    Earth.tsx      custom globe/atmosphere shaders, land dots, graticule
    Network.tsx    arcs, pulses, node markers, scars, shockwaves, picking
    OrbitLayer.tsx synthetic orbital tracks, markers, stations, ground links
    geo.ts         lat/lon math, arc curves, graticule builder
    Fx.tsx         lazy post chain (Bloom + Vignette, high tier only)
  ui/
    TopStrip, ScenarioPanel, ImpactConsole, CoreInstrument, Inspector,
    Timeline, ShareMenu, FirstRun, Rolled, format
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
  (pulses, rings, orbital progression) runs at full frame rate from refs, never
  through React state.

## State flow

`user action → store.failures/simT → recompute snapshot → subscribers render`
Snapshots are memoised by the store update itself (one recompute per clock tick).

## Preview vs. execution

Selecting a scenario **arms** it: the deterministic step list is loaded, the
clock parks at T+00:00, `armed` holds the scenario's projected end-state metrics
and orbit state, and nothing fails until the operator presses PLAY. `armed` is
cleared by PLAY, by scrubbing forward, and by any manual takedown — so the flag
alone is the contract for "the console is projecting, not reporting".

Hovering a scenario sets `hoverScenarioId`; the globe uses it (with
`scenarioTargets`) to wash the routes the scenario would touch in amber. Hover
never touches the simulation.

## Orbit / ground-segment dependency

`orbitState(edges, snapshot)` is a pure function of the terrestrial snapshot:

1. A ground station is reachable only while the mesh reaches its node over at
   least one healthy terrestrial edge (strained-only ⇒ `strained`, else
   `unreachable`).
2. Each orbital class collapses its stations into per-stage health across
   `ground-segment → telemetry → command → timing → dissemination`, with the
   real asymmetry: command survives on any one site, telemetry and
   dissemination degrade per site lost.
3. `orbitHealth` averages the orbital classes; `controlHealth` is the
   mission-control class reachability. Spacecraft are never reported as lost —
   `autonomous` is unconditional, and the UI says so.

View mode (`network` / `orbit` / `hybrid`) is presentation only: it selects which
layers the globe draws. The two health readouts are computed in every mode
because they are facts about the current state, not about what is drawn.
