# SIMULATION MODEL

Educational, deterministic, inspectable. Every number in the UI traces to this file.

## Demand model

Each edge carries fixed baseline `demand` (synthetic units). Node demand is
descriptive; routing operates on edge demand. There is no live traffic input.

## Failure application

Failures are an ordered list `{kind, id, at, amount?, cause}`:

- `edge` — segment removed; its demand reroutes (protection switch at `at+1`).
- `node` — facility removed; all incident edges lose capacity simultaneously.
- `surge` — exogenous demand added to an edge (leak attraction, failover
  stampede). Never rerouted, never shed — it is offered load.
- `recover-edge` / `recover-node` — capacity returns at time `at`.

## Rerouting (per failed edge, in failure order)

1. Compute up to **3 loop-free alternate paths** between the edge's endpoints
   over healthy edges (Dijkstra on latency weights, cumulative exclusion for
   diversity — ECMP-like).
2. **Policy exclusions:** DNS-kind links are excluded unless a DNS node is an
   endpoint; cloud-kind links likewise for cloud nodes. (Without this, Atlantic
   reroutes would transit DNS zone-sync paths — cheap on paper, nonsense in
   practice.)
3. Split demand **40 / 35 / 25** (60/40 for two paths, 100% for one).
4. **Headroom cap:** a path only accepts what its tightest link can take up to
   `SHED_AT × capacity`. The remainder is **shed (lost)** and reported, never
   stacked. This bounds utilisation and models congestion loss.

## Cascade

After initial rerouting, repeat (max 6 rounds): trip the single most-overloaded
edge above `TRIP_ABOVE`, reroute its carried load, continue until nothing
exceeds the threshold. Trips emit `OVERLOAD TRIP` events with true utilisation.

## Node states

`failed` (direct hit) · `isolated` (outside the surviving mesh component or no
healthy incident edge) · `degraded` (incident strain) · `healthy`.

## Metrics (all labelled SIMULATED in UI)

- **connectivity** = served / total demand (shed demand is unserved)
- **rerouted / unserved shares**, **failed / strained / overloaded** route counts
- **unreachable nodes**, **degraded regions**
- **latency shift %** — representative path-stretch estimate from rerouted share
- **resilience 0–100** — composite: connectivity × 70, penalties per strained /
  overloaded / unreachable, headroom bonus. A teaching score, not a standard.
- **regionImpact** — per-region ratio of *affected* demand (dropped for lack of a
  path + load absorbed by alternates) over that region's baseline demand. Each
  edge is counted once, attributed to the region carrying more of its demand, so
  shares stay in 0..1 and are comparable. Sorted worst-first; the console only
  renders regions above a 2% floor.

## Constants

| Name | Value | Meaning |
|------|-------|---------|
| `STRAIN_AT` | 0.8 | amber from here |
| `OVERLOAD_ABOVE` | 1.0 | shown as overloaded |
| `TRIP_ABOVE` | 1.2 | protection trips above here |
| `SHED_AT` | 1.5 | reroutes stop stacking above here; excess drops |
| `ALT_SPLIT` | 40/35/25 | diverse-path demand split |
| `MAX_CASCADE_ROUNDS` | 6 | cascade loop bound |
| `MAX_TRIPS_PER_ROUND` | 1 | sequential protection |

## Determinism

Pathfinding is order-stable (sorted adjacency, id tie-breaks). Randomness exists
only in chaos-plan generation and cosmetic jitter, both from seeded streams
(`rngFor(seed, purpose)`). Same seed + same failures ⇒ identical metrics,
events, and visuals.

## Orbital dependency model (SYNTHETIC)

`orbitState()` is a pure function of the terrestrial snapshot — it adds no new
failure kinds and never changes `runSimulation`, so replay and share determinism
are untouched.

The load-bearing claim: **a terrestrial outage does not take a spacecraft
offline.** Spacecraft keep flying and keep on-board autonomy. What degrades is
everything the spacecraft needs the ground segment for.

1. **Ground station reachability** — a station is `nominal` while the mesh reaches
   its node over ≥1 healthy terrestrial edge, `strained` when only strained or
   overloaded edges remain, `unreachable` when the node is failed, isolated or
   has no surviving path.
2. **Propagation** — per class, stations collapse into per-stage health across
   `ground-segment → telemetry → command → timing → dissemination`:
   - command needs **any one** usable site (redundant ground segment)
   - telemetry and dissemination degrade **per site lost** (no diversity = late
     or missing data)
   - ground-segment and timing are proportional, with strained sites counted half
3. **Aggregation** — `orbitHealth` = mean stage health across the orbital
   classes; `controlHealth` = mission-control class reachability. The two degrade
   independently, which is why the top strip reports MESH / ORBIT / CONTROL
   separately.

See `data/orbit.ts` for the synthetic classes and `DATA_SOURCES.md` for the
disclosure. All orbital data is fictional and simplified.
