# VISUAL SYSTEM

Direction: **instrument-room dark** — mission-control console × scientific
instrument (NORAD wall + oscilloscope faceplate + printed cable map).

## Design brief (locked before any component)

- Purpose: break simplified infrastructure, trace rerouting and cross-domain impact.
- Audience: curious public, students, engineers; desktop-first, mobile-intentional.
- Tone: precision, darkness, scale, tension, clarity.
- Reference: command walls, oscilloscope faceplates, submarine-cable prints.
- Palette: graphite base, bone-white ink, cyan healthy, amber strain, red failure,
  teal reroute/recovery. One status colour at a time.
- Type: Archivo (display, uppercase kickers) + IBM Plex Sans (text) +
  IBM Plex Mono (data, tabular numerals).
- Memorable: the globe that wounds — a red shock-ring blooms, traffic bleeds
  amber onto survivors.
- Restraint: **no cards, no gradients, no glassmorphism, no pills.** Hairline
  rules, flat panels, 2px radius max. (See `src/styles.css` token block.)

## Network visual grammar

| Channel | Meaning |
|---------|---------|
| Line presence | modelled segment (thickness class in inspector, not pixels) |
| Pulse velocity/density | traffic movement (faster/denser = hotter) |
| Brightness | utilisation |
| Teal | carrying rerouted load |
| Amber oscillation | strain ≥80% |
| Orange-red | overloaded >100% |
| Red break + shock ring | failed; ring marks event origin |
| Dashed/ghosted amber route, marker or rail | projected scenario impact, not an executed failure |
| White ring halo | selection |
| Marker shape | hub octahedron · ixp cube · landing sphere · cloud icosahedron · dns torus |

Bloom is restrained (0.27, high threshold) and loads lazily, high tier only.
The high-quality surface gain is 0.82; atmosphere geometry and rim glow are preserved.
The day side is deliberately dark — the globe must stay readable under 54 arcs.

## Orbital layer

| Channel | Meaning |
|---------|---------|
| Thin closed track | synthetic orbital plane for one class (altitude separation only) |
| Sparse octahedron marker | one spacecraft, moving slowly along its track |
| Ground-station ring on the surface | a modelled ground segment site |
| Ground-to-orbit link | the dependency itself; disappears when the station is unreachable |
| Amber track/marker/link | a class the terrestrial event actually degraded |
| Red marker | confirmed loss of every ground station for that class |
| Ghosted amber marker/link | projected ground dependency degradation while armed |

Markers are capped at 12 across all classes and labels appear only for degraded
classes, hidden when the orbit passes behind the globe. The spacecraft is never
drawn as damaged, exploding or falling: the layer shows dependency propagation,
not destruction. ORBIT view also dims the terrestrial arcs to 40% so the globe
stays readable; failures, selection and armed previews are never dimmed.

## Panel hierarchy

Right column, in order: dominant system state → one primary reading (the
connectivity core, a linear 21-tick scale with quarter numerals above an
unobstructed percentage) → metric groups by system meaning (FLOW / FAILURE / STRESS,
hairline bands, numbers dominate, quiet at nominal) → vertical orbit
dependency chain (one propagation spine, per-class stage segments, explicit
spacecraft-autonomy line) → regional impact (integers on a 0–100 scale,
collapsed to one line at nominal) → inspector detail. Only one element is
allowed to be large; everything else is hairline monospace at instrument
density. Armed (PROJECTED, ghosted scale, ◇ marker) vs playing (LIVE, solid
scale, ● marker) is a structural difference, never text alone.

## Anti-pattern audit (must stay true)

No rounded cards, no gradient text, no SaaS purple, no blobs, no glass, no hero
marketing wall, no hamburger on desktop, no floating pills, no fake terminal, no
scanlines, no glow-everywhere, no intro gate. The globe is the hero; panels are
instruments around it. Scenario entries are angular mission controls — zero
radius, chamfered corner, hairline border — never soft cards.
