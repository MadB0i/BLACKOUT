# VISUAL SYSTEM

Direction: **instrument-room dark** — mission-control console × scientific
instrument (NORAD wall + oscilloscope faceplate + printed cable map).

## Design brief (locked before any component)

- Purpose: break simplified internet infrastructure, watch reroute/blast radius.
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
| White ring halo | selection |
| Marker shape | hub octahedron · ixp cube · landing sphere · cloud icosahedron · dns torus |

Bloom is restrained (0.32, high threshold) and loads lazily, high tier only.
The day side is deliberately dark — the globe must stay readable under 54 arcs.

## Anti-pattern audit (must stay true)

No rounded cards, no gradient text, no SaaS purple, no blobs, no glass, no hero
marketing wall, no hamburger on desktop, no floating pills, no fake terminal, no
scanlines, no glow-everywhere, no intro gate. The globe is the hero; panels are
instruments around it.
