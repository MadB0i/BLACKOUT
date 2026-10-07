// Central interaction + simulation state (zustand).
// Simulation truth lives in src/core (pure functions); this store only
// coordinates failures, playback position, selection and UI prefs.

import { create } from 'zustand';
import { buildChaosPlan } from '../data/chaos';
import { getScenario, scenarioSteps } from '../data/scenarios';
import { EDGES, NODES } from '../data/topology';
import { horizonOf, runSimulation, snapshotAt } from '../core/simulation';
import { orbitState } from '../core/orbitSim';
import type { Failure, OrbitState, Snapshot } from '../core/types';
import { decodeShare } from '../core/serialize';

export type Selection = { kind: 'edge' | 'node'; id: string } | null;
export type Quality = 'auto' | 'high' | 'low';
/** Which dependency domains the globe draws. */
export type View = 'network' | 'orbit' | 'hybrid';

export interface Layers {
  submarine: boolean;
  terrestrial: boolean;
  cloud: boolean;
  dns: boolean;
}

/** Snapshot shown while a scenario is armed but not yet playing. */
export interface ArmedPreview {
  scenarioId: string;
  metrics: Snapshot['metrics'];
  orbit: OrbitState;
}

interface BlackoutState {
  scenarioId: string | null;
  seed: string;
  failures: Failure[];
  simT: number;
  playing: boolean;
  speed: number;
  selection: Selection;
  layers: Layers;
  view: View;
  quality: Quality;
  reducedMotion: boolean;
  hintDismissed: boolean;
  focus: { lon: number; lat: number; nonce: number } | null;
  notice: string | null;
  snapshot: Snapshot;
  orbit: OrbitState;
  /** end-state metrics for the armed scenario (null when nothing is armed) */
  armed: ArmedPreview | null;
  /** scenario currently hovered in the library — preview only, never applied */
  hoverScenarioId: string | null;
  horizon: number;

  loadScenario: (id: string) => void;
  hoverScenario: (id: string | null) => void;
  takeOffline: (kind: 'edge' | 'node', id: string) => void;
  recover: (kind: 'edge' | 'node', id: string) => void;
  surge: (edgeId: string, amount: number) => void;
  startChaos: (seed?: string) => void;
  reset: () => void;
  setSimT: (t: number) => void;
  setPlaying: (p: boolean) => void;
  setSpeed: (s: number) => void;
  select: (s: Selection) => void;
  toggleLayer: (k: keyof Layers) => void;
  setView: (v: View) => void;
  setQuality: (q: Quality) => void;
  setReducedMotion: (v: boolean) => void;
  dismissHint: () => void;
  requestFocus: (lon: number, lat: number) => void;
  notify: (msg: string | null) => void;
  applyShare: (s: string) => boolean;
}

let cache: {
  failures: Failure[];
  t: number;
  snapshot: Snapshot | null;
  orbit: OrbitState | null;
  horizon: number;
} = { failures: [], t: -1, snapshot: null, orbit: null, horizon: 0 };

function recompute(
  failures: Failure[],
  simT: number,
): { snapshot: Snapshot; orbit: OrbitState; horizon: number } {
  const t = Math.floor(simT);
  // Snapshot identity is the scene's render trigger: reuse it while neither
  // the failure set nor the integer second changed, so playback re-renders
  // the scene at 1Hz instead of 10Hz. Scrub/step/recover stay exact.
  if (cache.snapshot && cache.failures === failures && cache.t === t) {
    return { snapshot: cache.snapshot, orbit: cache.orbit!, horizon: cache.horizon };
  }
  const snapshot = snapshotAt(NODES, EDGES, failures, t);
  const orbit = orbitState(EDGES, snapshot);
  const horizon = horizonOf(failures);
  cache = { failures, t, snapshot, orbit, horizon };
  return { snapshot, orbit, horizon };
}

/** End-state preview for a scenario: every step applied, simulation not started. */
function armedPreview(id: string): ArmedPreview | null {
  if (!getScenario(id)) return null;
  const steps = scenarioSteps(id);
  const snapshot = runSimulation(NODES, EDGES, steps);
  return { scenarioId: id, metrics: snapshot.metrics, orbit: orbitState(EDGES, snapshot) };
}

function withSim(s: { failures: Failure[]; simT: number }): Pick<
  BlackoutState,
  'snapshot' | 'orbit' | 'horizon'
> {
  return recompute(s.failures, s.simT);
}

export const useBlackout = create<BlackoutState>()((set, get) => {
  const init = recompute([], 0);
  return {
    scenarioId: null,
    seed: 'live-session',
    failures: [],
    simT: 0,
    playing: false,
    speed: 1,
    selection: null,
    layers: { submarine: true, terrestrial: true, cloud: true, dns: true },
    view: 'network',
    quality: 'auto',
    reducedMotion:
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    hintDismissed: false,
    focus: null,
    notice: null,
    snapshot: init.snapshot,
    orbit: init.orbit,
    armed: null,
    hoverScenarioId: null,
    horizon: init.horizon,

    // Arming a scenario loads its deterministic step list and parks the clock at
    // T+00:00. Nothing fails until the operator presses PLAY — the library, the
    // globe preview and the console all read the armed end-state meanwhile.
    loadScenario: (id) => {
      const sc = getScenario(id);
      if (!sc) return;
      const steps = scenarioSteps(id);
      const simT = 0;
      set({
        scenarioId: id,
        seed: sc.seed,
        failures: steps.map((f) => ({ ...f })),
        simT,
        playing: false,
        selection: null,
        armed: armedPreview(id),
        ...withSim({ failures: steps, simT }),
      });
    },

    hoverScenario: (id) => set({ hoverScenarioId: id }),

    takeOffline: (kind, id) => {
      const { failures, simT } = get();
      const at = Math.floor(simT);
      const cause = kind === 'edge' ? 'manual takedown by operator' : 'manual takedown by operator';
      const next = [...failures, { kind, id, at, cause } as Failure];
      // Manual deviation leaves the authored script: preview mode ends.
      set({ failures: next, playing: true, armed: null, ...withSim({ failures: next, simT }) });
    },

    recover: (kind, id) => {
      const { failures, simT } = get();
      const at = Math.floor(simT);
      const rk = kind === 'edge' ? 'recover-edge' : 'recover-node';
      const next = [...failures, { kind: rk, id, at, cause: 'manual recovery by operator' } as Failure];
      set({ failures: next, playing: true, armed: null, ...withSim({ failures: next, simT }) });
    },

    surge: (edgeId, amount) => {
      const { failures, simT } = get();
      const at = Math.floor(simT);
      const next = [...failures, { kind: 'surge', id: edgeId, at, amount, cause: 'manual surge injection' } as Failure];
      set({ failures: next, playing: true, armed: null, ...withSim({ failures: next, simT }) });
    },

    startChaos: (seed) => {
      const s = (seed ?? `blackout-chaos-${Math.floor(Date.now() / 1000)}`).slice(0, 40);
      const plan = buildChaosPlan(s);
      const endState = runSimulation(NODES, EDGES, plan.steps);
      set({
        scenarioId: 'chaos',
        seed: s,
        failures: plan.steps,
        simT: 0,
        playing: false,
        selection: null,
        armed: {
          scenarioId: 'chaos',
          metrics: endState.metrics,
          orbit: orbitState(EDGES, endState),
        },
        ...withSim({ failures: plan.steps, simT: 0 }),
      });
    },

    reset: () =>
      set({
        scenarioId: null,
        failures: [],
        simT: 0,
        playing: false,
        selection: null,
        armed: null,
        hoverScenarioId: null,
        ...withSim({ failures: [], simT: 0 }),
      }),

    setSimT: (t) => {
      const { failures, horizon, armed } = get();
      const clamped = Math.max(0, Math.min(horizon, t));
      // Moving the clock ends preview mode: from here the console shows live state.
      set({
        simT: clamped,
        armed: clamped > 0 ? null : armed,
        ...withSim({ failures, simT: clamped }),
      });
    },

    // PLAY starts execution and therefore ends preview mode.
    setPlaying: (playing) => set((s) => (playing && s.armed ? { playing, armed: null } : { playing })),
    setSpeed: (speed) => set({ speed }),
    select: (selection) => set({ selection }),
    toggleLayer: (k) => set((s) => ({ layers: { ...s.layers, [k]: !s.layers[k] } })),
    setView: (view) => set({ view }),
    setQuality: (quality) => set({ quality }),
    setReducedMotion: (reducedMotion) => set({ reducedMotion }),
    dismissHint: () => set({ hintDismissed: true }),
    requestFocus: (lon, lat) => set((s) => ({ focus: { lon, lat, nonce: (s.focus?.nonce ?? 0) + 1 } })),
    notify: (notice) => set({ notice }),

    applyShare: (raw) => {
      const decoded = decodeShare(raw);
      if (!decoded) return false;
      set({
        scenarioId: decoded.scenario,
        seed: decoded.seed,
        failures: decoded.fails,
        simT: decoded.t,
        playing: false,
        selection: null,
        armed: decoded.scenario ? armedPreview(decoded.scenario) : null,
        ...withSim({ failures: decoded.fails, simT: decoded.t }),
      });
      return true;
    },
  };
});

/** Advance the simulation clock; called from a single rAF loop in App. */
export function advanceClock(dtSeconds: number) {
  const s = useBlackout.getState();
  if (!s.playing) return;
  const next = s.simT + dtSeconds * s.speed;
  if (next >= s.horizon) {
    s.setSimT(s.horizon);
    s.setPlaying(false);
    return;
  }
  s.setSimT(next);
}
