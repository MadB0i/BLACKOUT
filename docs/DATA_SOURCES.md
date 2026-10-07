# DATA SOURCES

Machine-readable manifest for every geographic/network input to BLACKOUT.
Rule: no proprietary infrastructure dataset is scraped, bundled, or redistributed.

| # | Name | Source | URL | License | Accessed | Preprocessing | Fields retained | Limitations |
|---|------|--------|-----|---------|----------|---------------|-----------------|-------------|
| 1 | Land 110m (coastline polygons) | Natural Earth via `world-atlas@2` | https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json | Natural Earth: public domain; world-atlas: ISC | 2026-10-06 | `scripts/build_land.py`: minimal TopoJSON decode → planar-area-weighted sampling of 5,200 coastline-adjacent dots, seeded (20261006) | `dots: [[lon, lat]]`, `count`, `source` → `src/data/landDots.json` | 110m resolution only; dots are a visual texture, not a coastline dataset; Antarctica clipped at −84° |
| 2 | City coordinates (node placement) | General geographic fact (cross-checked against common references) | — | Facts are not copyrightable; no dataset redistributed | 2026-10-06 | Hand-entered lat/lon for 26 labelled places | lat, lon per node | Approximate to ~0.1°; used for globe placement only |
| 3 | Network topology (nodes, edges, capacities, demands, latencies) | **Synthetic — authored for BLACKOUT** | — (this repo, `src/data/topology.ts`) | MIT (project license) | — | None — invented values | All fields | **Not real measurements.** Capacity/demand are abstract model units; corridor names are evocative, not authoritative; see SIMULATION_MODEL.md |
| 4 | Orbital classes and ground stations (ORBIT / HYBRID view) | **Synthetic — authored for BLACKOUT** | — (this repo, `src/data/orbit.ts`) | MIT (project license) | — | None — invented values | class, altitude (km), inclination (deg), station site + callsign | **Not real constellations, not real stations.** Class definitions are deliberately generic (GNSS/timing, LEO connectivity, weather, Earth observation, mission control) rather than any named programme. Altitudes, inclinations, station counts and callsigns are plausible but fictional. Ground stations sit on the same synthetic terrestrial nodes as the network model, so the dependency path is traceable in one model. |

## Orbital-layer disclosure

The ORBIT and HYBRID views are a **simplified educational model**, disclosed in
the UI in the same way as the terrestrial model:

- the left panel shows `SYNTHETIC EDUCATIONAL MODEL · S/C AUTONOMOUS`
- the viewport note adds `ORBIT LAYER SYNTHETIC — SPACE SYSTEMS KEEP OPERATING`
- the console's dependency chain carries a `SYNTHETIC MODEL` marker and an
  explicit `Spacecraft remain in autonomous operation.` status line

The model deliberately does **not** claim that a terrestrial blackout destroys or
shuts down satellites. It models dependency pathways only: mission-control
reachability, ground-station backhaul, telemetry delivery, command-path
availability, timing/distribution and data dissemination.

## What is NOT in this project

- TeleGeography submarine-cable data (proprietary) — not used, not scraped.
- PeeringDB / BGP / outage feeds — not used; there is no live data path at all.
- Any tile server, font API beyond Google Fonts CSS, or runtime network call.

## Attribution

- Land rendering derived from Natural Earth (public domain) via world-atlas (ISC). Thank you to the Natural Earth contributors.
- Rebuilding `src/data/landDots.json`: `npm run build:land` (requires network; writes a graticule-only fallback when offline).
