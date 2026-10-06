// Shared formatting + derived status wording (kept honest: "simulated").

import type { Metrics } from '../core/types';

export function fmtTime(t: number): string {
  const s = Math.max(0, Math.floor(t));
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

export function fmtPct01(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

export type SystemState = 'NOMINAL' | 'STRAINED' | 'DEGRADED' | 'CRITICAL';

export function systemState(m: Metrics, failureCount: number): SystemState {
  if (failureCount === 0) return 'NOMINAL';
  if (m.connectivity < 0.9 || m.unreachableNodes >= 4 || m.overloadedRoutes >= 4) return 'CRITICAL';
  if (m.connectivity < 0.97 || m.unreachableNodes >= 1 || m.strainedRoutes + m.overloadedRoutes >= 3)
    return 'DEGRADED';
  return 'STRAINED';
}
