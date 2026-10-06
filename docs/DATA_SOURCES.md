# DATA SOURCES

Machine-readable manifest for every geographic/network input to BLACKOUT.
Rule: no proprietary infrastructure dataset is scraped, bundled, or redistributed.

| # | Name | Source | URL | License | Accessed | Preprocessing | Fields retained | Limitations |
|---|------|--------|-----|---------|----------|---------------|-----------------|-------------|
| 1 | Land 110m (coastline polygons) | Natural Earth via `world-atlas@2` | https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json | Natural Earth: public domain; world-atlas: ISC | 2026-10-06 | `scripts/build_land.py`: minimal TopoJSON decode → planar-area-weighted sampling of 5,200 coastline-adjacent dots, seeded (20261006) | `dots: [[lon, lat]]`, `count`, `source` → `src/data/landDots.json` | 110m resolution only; dots are a visual texture, not a coastline dataset; Antarctica clipped at −84° |
| 2 | City coordinates (node placement) | General geographic fact (cross-checked against common references) | — | Facts are not copyrightable; no dataset redistributed | 2026-10-06 | Hand-entered lat/lon for 26 labelled places | lat, lon per node | Approximate to ~0.1°; used for globe placement only |
| 3 | Network topology (nodes, edges, capacities, demands, latencies) | **Synthetic — authored for BLACKOUT** | — (this repo, `src/data/topology.ts`) | MIT (project license) | — | None — invented values | All fields | **Not real measurements.** Capacity/demand are abstract model units; corridor names are evocative, not authoritative; see SIMULATION_MODEL.md |

## What is NOT in this project

- TeleGeography submarine-cable data (proprietary) — not used, not scraped.
- PeeringDB / BGP / outage feeds — not used; there is no live data path at all.
- Any tile server, font API beyond Google Fonts CSS, or runtime network call.

## Attribution

- Land rendering derived from Natural Earth (public domain) via world-atlas (ISC). Thank you to the Natural Earth contributors.
- Rebuilding `src/data/landDots.json`: `npm run build:land` (requires network; writes a graticule-only fallback when offline).
