// Shared formatting + derived status wording (kept honest: "simulated").

import type { Failure, Metrics, OrbitStageId, OrbitStageState, OrbitState } from '../core/types';
import type { ArmedPreview } from '../state/store';

export function fmtTime(t: number): string {
  const s = Math.max(0, Math.floor(t));
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

export function fmtPct01(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

export function fmtPctInt(v: number): string {
  return `${Math.round(v * 100)}%`;
}

export function fmtInt(v: number): string {
  return String(Math.round(v));
}

/** Resilience is a 0–100 score; it rolls as a share so it animates smoothly. */
export function fmtResilience(v: number): string {
  return `${Math.round(v * 100)}/100`;
}

export function fmtLatency(v: number): string {
  return `+${Math.round(v)}%`;
}

export type SystemState = 'NOMINAL' | 'STRAINED' | 'DEGRADED' | 'CRITICAL';

export function systemState(m: Metrics, failureCount: number): SystemState {
  if (failureCount === 0) return 'NOMINAL';
  if (m.connectivity < 0.9 || m.unreachableNodes >= 4 || m.overloadedRoutes >= 4) return 'CRITICAL';
  if (m.connectivity < 0.97 || m.unreachableNodes >= 1 || m.strainedRoutes + m.overloadedRoutes >= 3)
    return 'DEGRADED';
  return 'STRAINED';
}

/** The console is showing a projected scenario, not the live simulation. */
export function isPreviewing(armed: ArmedPreview | null): boolean {
  // `armed` is cleared the instant the clock moves or PLAY is pressed, so the
  // armed flag alone is the whole contract.
  return armed !== null;
}

export type ConsoleMode = {
  mode: 'SCENARIO PREVIEW' | 'FAILURE ACTIVE' | 'SYSTEM NOMINAL';
  detail: string;
  tone: 'nominal' | 'armed' | 'degraded';
};

/** Header state for the impact console. */
export function consoleMode(
  metrics: Metrics,
  failures: Failure[],
  armed: ArmedPreview | null,
): ConsoleMode {
  const state = systemState(metrics, failures.length);
  if (failures.length === 0 && !armed) {
    return { mode: 'SYSTEM NOMINAL', detail: 'MESH STABLE', tone: 'nominal' };
  }
  if (armed) {
    return { mode: 'SCENARIO PREVIEW', detail: 'PROJECTED — NOT YET EXECUTED', tone: 'armed' };
  }
  return {
    mode: 'FAILURE ACTIVE',
    detail: state === 'NOMINAL' ? 'MESH STABLE' : `MESH ${state}`,
    tone: state === 'CRITICAL' ? 'degraded' : state === 'NOMINAL' ? 'nominal' : 'armed',
  };
}

/** Word shown under the core instrument — the number's meaning in plain terms. */
export function coreLabel(value: number): string {
  if (value >= 0.995) return 'MESH RETAINED';
  if (value >= 0.9) return 'MESH MOSTLY INTACT';
  if (value >= 0.6) return 'MESH DEGRADED';
  if (value > 0) return 'MESH FRACTURED';
  return 'MESH OFFLINE';
}

/** Impact ratio → semantic band, used by the instrument and the region bars. */
export function impactBand(impact: number): 'ok' | 'warn' | 'bad' {
  if (impact <= 0.001) return 'ok';
  if (impact < 0.34) return 'warn';
  return 'bad';
}

export function orbitBand(health: number): 'ok' | 'warn' | 'bad' {
  if (health >= 0.999) return 'ok';
  if (health >= 0.5) return 'warn';
  return 'bad';
}

export function domainStateLabel(orbit: OrbitState): string {
  const c = orbit.controlHealth;
  const o = orbit.orbitHealth;
  if (c >= 0.999 && o >= 0.999) return 'ALL SEGMENTS NOMINAL';
  // Control is upstream of every other dependency: report it first.
  if (c <= 0.34) return 'GROUND SEGMENT ISOLATED';
  if (c < 0.999) return 'GROUND SEGMENT DEGRADED';
  if (o <= 0.34) return 'GROUND-DEPENDENT SERVICES ISOLATED';
  return 'GROUND-DEPENDENT SERVICES DEGRADED';
}

/** Short region codes for the compact impact table. */
export const REGION_SHORT: Record<string, string> = {
  NAM: 'N.AMER',
  SAM: 'S.AMER',
  EUR: 'EUROPE',
  AFR: 'AFRICA',
  MEA: 'MID.EAST',
  SAS: 'S.ASIA',
  EAS: 'E.ASIA',
  SEA: 'SE.ASIA',
  OCE: 'OCEANIA',
};

/* ---------- orbit dependency chain (presentation aggregates) ---------- */

/** Chain order for the vertical propagation view. */
export const CHAIN_ORDER: OrbitStageId[] = [
  'ground-segment',
  'telemetry',
  'command',
  'timing',
  'dissemination',
];

/** Compact stage names for the chain rows. */
export const CHAIN_SHORT: Record<OrbitStageId, string> = {
  'ground-segment': 'GROUND',
  telemetry: 'TELEMETRY',
  command: 'COMMAND',
  timing: 'TIMING',
  dissemination: 'DISSEMINATION',
};

const STAGE_RANK: Record<OrbitStageState, number> = {
  nominal: 0,
  strained: 1,
  delayed: 1,
  unreachable: 2,
};

/** Worst state across a set of stage readings — display aggregation only. */
export function worstStageState(states: OrbitStageState[]): OrbitStageState {
  let worst: OrbitStageState = 'nominal';
  for (const s of states) {
    if (STAGE_RANK[s] > STAGE_RANK[worst]) worst = s;
  }
  return worst;
}
