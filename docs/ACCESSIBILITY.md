# ACCESSIBILITY

Target: WCAG 2.2 AA for everything outside the WebGL canvas; best-effort equivalence inside it.

## What is implemented

- **Semantics first:** real `<button>`, `<input>`, `<select>`, landmarks
  (`banner`, `main`, `complementary` via asides, `contentinfo`-ish footer with
  `aria-label`), one `h1`, skip link.
- **Keyboard:** every action reachable — route list, scenarios, transport,
  scrub slider, share/export. Shortcuts: `Space` play/pause, `←/→` ±2s,
  `R` reset, `Esc` clear selection. Focus ring is always visible (cyan 2px).
- **Names:** icon-ish buttons carry `aria-label`s (`Step forward 2 seconds`);
  canvas region labelled; tooltip content duplicated in the inspector.
- **Non-color failure signalling:** status words (FAILED/DOWN/STRAINED), shape
  coding on markers, `%` numerals, event log text. Nothing is color-only.
- **Live regions:** system state + connectivity (`aria-live=polite`), event log
  list, share/export status (`role=status`).
- **Contrast:** bone-white on graphite ≈ 14:1; secondary ≈ 5.5:1; amber/red
  used for large/status text ≥3:1 on dark.
- **Reduced motion:** honours `prefers-reduced-motion` at startup (store
  initialises from `matchMedia`) plus a manual `MOTION` toggle. Minimal mode
  stops auto-rotation, camera swoops (jump cuts), pulse travel, shock expansion,
  and the first-run pulse. Simulation remains fully usable.
- **Touch:** ≥44px targets on coarse layouts (media query), bottom-sheet share,
  fat invisible hit-spheres on nodes.
- **Error/recovery:** WebGL-unavailable renders an explanatory panel with the
  simulation still operable; invalid share links notify and start clean.

## Known limits

- The 3D globe itself is not screen-reader navigable; the route list +
  inspector + event log + metrics provide full functional equivalence.
- `elementFromPoint` tooltips are hover-only; selection state is the persistent,
  keyboard-reachable equivalent.
